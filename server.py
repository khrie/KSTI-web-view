#!/usr/bin/env python3
"""
KSTI 2026 - Search and Rescue (SAR)
LAN Web Server & Camera Recording Storage Server
Menyimpan rekaman kamera ke folder ./recordings dan menyediakan akses LAN (Wi-Fi/Lokal Internet)
untuk mengecek rekaman video pertandingan dari perangkat lain di jaringan yang sama.
"""

import os
import re
import sys
import csv
import io
import json
import time
import socket
import struct
import urllib.parse
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("KSTI_PORT", "8080"))
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
RECORDINGS_DIR = os.path.join(ROOT_DIR, "recordings")
METADATA_FILE = os.path.join(RECORDINGS_DIR, "metadata.json")
SCORE_CSV_FILE = os.path.join(ROOT_DIR, "Skor KSTI Robotics 2026 - SAR.csv")
LATEST_STATE = None
LATEST_STATE_TIMESTAMP = 0

os.makedirs(RECORDINGS_DIR, exist_ok=True)


def get_lan_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        primary = s.getsockname()[0]
        s.close()
        if primary and not primary.startswith("127."):
            ips.append(primary)
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        _, _, addr_list = socket.gethostbyname_ex(hostname)
        for ip in addr_list:
            if ip and not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except Exception:
        pass

    if not ips:
        ips.append("127.0.0.1")
    return ips


def load_metadata():
    if not os.path.exists(METADATA_FILE):
        return {}
    try:
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_metadata(meta_dict):
    try:
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(meta_dict, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[WARN] Gagal menyimpan metadata.json: {e}")


def sanitize_filename_part(text):
    clean = re.sub(r"[^A-Za-z0-9_-]+", "_", str(text or "").strip())
    clean = re.sub(r"_+", "_", clean).strip("_")
    return clean or "Tim"


def patch_webm_buffer(data, fallback_duration_ms=0):
    """
    Menyuntikkan elemen EBML Duration (0x44 0x89) ke dalam blok Info WebM
    agar video hasil rekaman browser memiliki durasi valid dan slider pemutar
    video (Windows Media Player, VLC, dll) aktif dan dapat digeser (seekable).
    """
    if not data or len(data) < 100 or not data.startswith(b"\x1a\x45\xdf\xa3"):
        return data

    info_id = b"\x15\x49\xa9\x66"
    info_pos = data.find(info_id)
    if info_pos == -1:
        return data

    if b"\x44\x89" in data[info_pos : info_pos + 200]:
        return data

    cluster_id = b"\x1f\x43\xb6\x75"
    pos = info_pos
    last_tc = 0
    while True:
        idx = data.find(cluster_id, pos)
        if idx == -1:
            break
        head = data[idx : idx + 35]
        tc_idx = head.find(b"\xe7")
        if tc_idx != -1:
            sz = head[tc_idx + 1] & 0x7F
            val = head[tc_idx + 2 : tc_idx + 2 + sz]
            if sz == 1:
                last_tc = val[0]
            elif sz == 2:
                last_tc = struct.unpack(">H", val)[0]
            elif sz == 3:
                last_tc = int.from_bytes(val, "big")
            elif sz == 4:
                last_tc = struct.unpack(">I", val)[0]
        pos = idx + 4

    dur_ms = float(last_tc) if last_tc > 0 else float(fallback_duration_ms)
    if dur_ms <= 0:
        return data

    pos = info_pos + 4
    first_byte = data[pos]
    mask = 0x80
    vlen = 1
    while not (first_byte & mask):
        mask >>= 1
        vlen += 1
        if vlen > 8:
            return data

    orig_info_size = first_byte & (~mask)
    for b in data[pos + 1 : pos + vlen]:
        orig_info_size = (orig_info_size << 8) | b

    info_content = data[pos + vlen : pos + vlen + orig_info_size]
    dur_elem = b"\x44\x89\x84" + struct.pack(">f", dur_ms)
    new_info_size = orig_info_size + len(dur_elem)

    if new_info_size < 0x7F:
        new_size_bytes = bytes([0x80 | new_info_size])
    elif new_info_size < 0x3FFF:
        new_size_bytes = bytes([0x40 | (new_info_size >> 8), new_info_size & 0xFF])
    else:
        new_size_bytes = bytes([0x20 | (new_info_size >> 16), (new_info_size >> 8) & 0xFF, new_info_size & 0xFF])

    return data[:pos] + new_size_bytes + dur_elem + info_content + data[pos + vlen + orig_info_size :]


def merge_csv_scores(existing_csv_text, incoming_csv_text):
    """
    Menggabungkan CSV skor lama dengan CSV baru secara aman.
    Jika browser operator baru ter-reset (localStorage kosong) dan mengirimkan
    baris tim kosong, skor tim yang sudah tersimpan sebelumnya di hard disk
    TIDAK AKAN terhapus atau tertimpa.
    """
    if not existing_csv_text or not existing_csv_text.strip():
        return incoming_csv_text
    if not incoming_csv_text or not incoming_csv_text.strip():
        return existing_csv_text

    def parse_rows(text):
        try:
            r = csv.reader(io.StringIO(text.strip()))
            rows = list(r)
            if not rows:
                return None, {}
            header = rows[0]
            data = {}
            for row in rows[1:]:
                if len(row) >= 5:
                    reg_no = row[2].strip()
                    name = row[3].strip()
                    key = reg_no if reg_no else name
                    data[key] = row
            return header, data
        except Exception:
            return None, {}

    ex_header, ex_map = parse_rows(existing_csv_text)
    inc_header, inc_map = parse_rows(incoming_csv_text)

    if not ex_map:
        return incoming_csv_text
    if not inc_map:
        return existing_csv_text

    header = inc_header or ex_header

    all_keys = list(inc_map.keys())
    for k in ex_map:
        if k not in all_keys:
            all_keys.append(k)

    merged_rows = []
    for k in all_keys:
        inc_row = inc_map.get(k)
        ex_row = ex_map.get(k)

        if inc_row and not ex_row:
            merged_rows.append(inc_row)
            continue
        if ex_row and not inc_row:
            merged_rows.append(ex_row)
            continue

        res_row = list(inc_row)
        while len(res_row) < 20:
            res_row.append("")
        while len(ex_row) < 20:
            ex_row.append("")

        for t_idx in range(3):
            base_col = 5 + t_idx * 4
            inc_final = res_row[base_col + 3].strip()
            inc_raw = res_row[base_col].strip()
            ex_final = ex_row[base_col + 3].strip()
            ex_raw = ex_row[base_col].strip()

            if not inc_final and not inc_raw and (ex_final or ex_raw):
                res_row[base_col] = ex_row[base_col]
                res_row[base_col + 1] = ex_row[base_col + 1]
                res_row[base_col + 2] = ex_row[base_col + 2]
                res_row[base_col + 3] = ex_row[base_col + 3]

        best_score = 0
        best_time = 300
        has_score = False

        for t_idx in range(3):
            base_col = 5 + t_idx * 4
            final_str = res_row[base_col + 3].strip()
            time_str = res_row[base_col + 1].strip()
            if final_str != "":
                has_score = True
                try:
                    s = int(float(final_str))
                    t = int(float(time_str)) if time_str else 300
                    if s > best_score or (s == best_score and t < best_time):
                        best_score = s
                        best_time = t
                except ValueError:
                    pass

        res_row[17] = str(best_score)
        res_row[18] = str(best_time)
        res_row[19] = "Selesai" if has_score else "Siap Bertanding"

        merged_rows.append(res_row)

    def sort_key(r):
        try:
            bs = int(float(r[17]))
        except Exception:
            bs = 0
        try:
            bt = int(float(r[18]))
        except Exception:
            bt = 300
        return (-bs, bt)

    rank = 1
    sorted_rows = sorted(merged_rows, key=sort_key)
    for r in sorted_rows:
        try:
            bs = int(float(r[17]))
        except Exception:
            bs = 0
        if bs > 0:
            r[0] = str(rank)
            rank += 1
        else:
            r[0] = "-"

    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(header)
    for r in sorted_rows:
        writer.writerow(r)

    return out.getvalue()


def load_trials_from_csv():
    """
    Membaca SCORE_CSV_FILE dan mengembalikan mapping riwayat percobaan tiap tim.
    Digunakan untuk memulihkan skor ke web browser jika localStorage terhapus.
    """
    if not os.path.exists(SCORE_CSV_FILE):
        return {}
    try:
        with open(SCORE_CSV_FILE, "r", encoding="utf-8") as f:
            r = csv.reader(f)
            rows = list(r)
        if len(rows) < 2:
            return {}
        result = {}
        for row in rows[1:]:
            if len(row) < 17:
                continue
            reg_no = row[2].strip()
            name = row[3].strip()
            trials = []
            for t_idx in range(3):
                base_col = 5 + t_idx * 4
                raw_str = row[base_col].strip()
                time_str = row[base_col + 1].strip()
                bonus_str = row[base_col + 2].strip()
                final_str = row[base_col + 3].strip()
                if final_str or raw_str:
                    try:
                        raw_val = int(float(raw_str)) if raw_str else 0
                        time_val = int(float(time_str)) if time_str else 300
                        final_val = int(float(final_str)) if final_str else 0
                        bonus_val = bonus_str.upper() == "YA"
                        trials.append({
                            "completed": True,
                            "rawScore": raw_val,
                            "timeSec": time_val,
                            "bonusFinish": bonus_val,
                            "finalScore": final_val
                        })
                    except Exception:
                        trials.append({})
                else:
                    trials.append({})
            if reg_no:
                result[reg_no] = trials
            if name:
                result[name] = trials
        return result
    except Exception as e:
        print(f"[WARN] Gagal membaca riwayat trial dari CSV: {e}")
        return {}


def build_recordings_list():
    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    meta_map = load_metadata()
    items = []
    valid_exts = (".webm", ".mp4", ".mkv", ".mov", ".ogg")

    for fname in os.listdir(RECORDINGS_DIR):
        if not fname.lower().endswith(valid_exts):
            continue
        fpath = os.path.join(RECORDINGS_DIR, fname)
        if not os.path.isfile(fpath):
            continue
        stat = os.stat(fpath)
        info = meta_map.get(fname, {})
        created_iso = info.get("createdAt") or datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        items.append({
            "filename": fname,
            "url": "/recordings/" + urllib.parse.quote(fname),
            "sizeBytes": stat.st_size,
            "mtime": stat.st_mtime,
            "createdAt": created_iso,
            "teamId": info.get("teamId", ""),
            "teamName": info.get("teamName", fname),
            "university": info.get("university", "-"),
            "trialIndex": info.get("trialIndex", 0),
            "trialLabel": info.get("trialLabel", "Percobaan 1"),
            "finalScore": info.get("finalScore", 0),
            "rawScore": info.get("rawScore", 0),
            "finishTimeSec": info.get("finishTimeSec", 0),
            "durationSec": info.get("durationSec", 0),
            "trigger": info.get("trigger", "Manual / Timer")
        })

    items.sort(key=lambda x: x["mtime"], reverse=True)
    return items


class KSTISARRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        route = parsed.path

        if route == "/api/info":
            lan_ips = get_lan_ips()
            primary_ip = lan_ips[0]
            return self.send_json({
                "ok": True,
                "port": PORT,
                "hostname": socket.gethostname(),
                "lan_ips": lan_ips,
                "primary_ip": primary_ip,
                "recordings_url": f"http://{primary_ip}:{PORT}/recordings.html",
                "operator_url": f"http://{primary_ip}:{PORT}/index.html",
                "display_url": f"http://{primary_ip}:{PORT}/display.html",
                "recordings_folder": RECORDINGS_DIR
            })

        if route == "/api/recordings":
            items = build_recordings_list()
            return self.send_json({
                "ok": True,
                "recordings_folder": RECORDINGS_DIR,
                "count": len(items),
                "recordings": items
            })

        if route == "/api/scores":
            if os.path.exists(SCORE_CSV_FILE):
                with open(SCORE_CSV_FILE, "r", encoding="utf-8") as f:
                    csv_text = f.read()
                return self.send_json({"ok": True, "csv": csv_text})
            else:
                return self.send_json({"ok": False, "error": "File CSV skor belum ada"}, status=404)

        if route == "/api/scores/download":
            if os.path.exists(SCORE_CSV_FILE):
                with open(SCORE_CSV_FILE, "rb") as f:
                    data = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", 'attachment; filename="Skor_KSTI_Robotics_2026_SAR.csv"')
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            else:
                return self.send_json({"ok": False, "error": "File CSV skor belum ada"}, status=404)

        if route == "/api/state":
            return self.send_json({
                "ok": True,
                "timestamp": LATEST_STATE_TIMESTAMP,
                "state": LATEST_STATE,
                "restoredTrials": load_trials_from_csv()
            })

        # Support HTTP Range requests for video files so scrubbing/seeking works on all LAN browsers
        range_header = self.headers.get("Range")
        if range_header and route.startswith("/recordings/"):
            rel_name = urllib.parse.unquote(route[len("/recordings/"):])
            safe_name = os.path.basename(rel_name)
            fpath = os.path.join(RECORDINGS_DIR, safe_name)
            if os.path.isfile(fpath):
                return self.serve_file_with_range(fpath, range_header)

        return super().do_GET()

    def serve_file_with_range(self, fpath, range_header):
        try:
            file_size = os.path.getsize(fpath)
            m = re.match(r"bytes=(\d+)-(\d*)", range_header)
            if not m:
                return super().do_GET()

            start = int(m.group(1))
            end = int(m.group(2)) if m.group(2) else file_size - 1
            end = min(end, file_size - 1)
            if start > end or start >= file_size:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{file_size}")
                self.end_headers()
                return

            length = end - start + 1
            ctype = self.guess_type(fpath)
            if fpath.lower().endswith(".webm"):
                ctype = "video/webm"
            elif fpath.lower().endswith(".mp4"):
                ctype = "video/mp4"

            self.send_response(206)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.send_header("Content-Length", str(length))
            self.end_headers()

            with open(fpath, "rb") as f:
                f.seek(start)
                remaining = length
                chunk_size = 64 * 1024
                while remaining > 0:
                    data = f.read(min(chunk_size, remaining))
                    if not data:
                        break
                    self.wfile.write(data)
                    remaining -= len(data)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:
            print(f"[WARN] Error serving range: {e}")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/state":
            global LATEST_STATE, LATEST_STATE_TIMESTAMP
            try:
                content_length = int(self.headers.get("Content-Length", "0"))
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode("utf-8"))
                state_data = payload.get("state", payload)
                ts = int(payload.get("timestamp", time.time() * 1000))
                if ts >= LATEST_STATE_TIMESTAMP:
                    LATEST_STATE = state_data
                    LATEST_STATE_TIMESTAMP = ts
                return self.send_json({"ok": True, "timestamp": LATEST_STATE_TIMESTAMP})
            except Exception as e:
                return self.send_json({"ok": False, "error": str(e)}, status=500)

        if parsed.path == "/api/scores":
            try:
                content_length = int(self.headers.get("Content-Length", "0"))
                post_data = self.rfile.read(content_length)
                content_type = self.headers.get("Content-Type", "")

                csv_text = ""
                if "application/json" in content_type:
                    payload = json.loads(post_data.decode("utf-8"))
                    csv_text = payload.get("csv", "")
                else:
                    csv_text = post_data.decode("utf-8")

                if not csv_text.strip():
                    return self.send_json({"ok": False, "error": "Data CSV kosong"}, status=400)

                # Ambil CSV lama jika ada untuk di-merge secara aman
                existing_csv = ""
                if os.path.isfile(SCORE_CSV_FILE):
                    try:
                        with open(SCORE_CSV_FILE, "r", encoding="utf-8") as f:
                            existing_csv = f.read()
                    except Exception:
                        existing_csv = ""

                final_csv = merge_csv_scores(existing_csv, csv_text)

                # Backup otomatis file CSV sebelum ditulis ulang
                if existing_csv.strip():
                    try:
                        with open(SCORE_CSV_FILE + ".bak", "w", encoding="utf-8", newline="") as f:
                            f.write(existing_csv)
                    except Exception:
                        pass

                with open(SCORE_CSV_FILE, "w", encoding="utf-8", newline="") as f:
                    f.write(final_csv)

                print(f"[SCORES] Skor tersimpan di: {SCORE_CSV_FILE}")
                return self.send_json({"ok": True, "message": "Skor berhasil disimpan ke CSV"})
            except Exception as e:
                return self.send_json({"ok": False, "error": str(e)}, status=500)

        if parsed.path != "/api/recordings":
            return self.send_json({"ok": False, "error": "Endpoint tidak ditemukan"}, status=404)

        try:
            qs = urllib.parse.parse_qs(parsed.query)
            team_id = qs.get("teamId", ["team_1"])[0]
            team_name = qs.get("teamName", ["Tim"])[0]
            university = qs.get("university", ["-"])[0]
            trial_index = int(qs.get("trialIndex", ["0"])[0] or 0)
            trial_label = qs.get("trialLabel", [f"Percobaan {trial_index + 1}"])[0]
            final_score = int(float(qs.get("finalScore", ["0"])[0] or 0))
            raw_score = int(float(qs.get("rawScore", ["0"])[0] or 0))
            finish_time_sec = int(float(qs.get("finishTimeSec", ["0"])[0] or 0))
            duration_sec = int(float(qs.get("durationSec", ["0"])[0] or 0))
            trigger = qs.get("trigger", ["Timer Lomba"])[0]
            ext = qs.get("ext", ["webm"])[0].lower().strip(".")
            if ext not in ("webm", "mp4", "mkv"):
                ext = "webm"

            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0:
                return self.send_json({"ok": False, "error": "Data video kosong"}, status=400)

            video_bytes = self.rfile.read(content_length)

            # Auto-patch WebM Duration agar slider di media player aktif dan seekable
            if ext == "webm":
                video_bytes = patch_webm_buffer(video_bytes, fallback_duration_ms=duration_sec * 1000)

            now = datetime.now()
            ts_str = now.strftime("%Y%m%d_%H%M%S")
            safe_team = sanitize_filename_part(team_name)
            safe_trial = f"Percobaan_{trial_index + 1}"
            fname = f"{ts_str}_{safe_team}_{safe_trial}_Skor_{final_score}.{ext}"
            fpath = os.path.join(RECORDINGS_DIR, fname)

            with open(fpath, "wb") as f:
                f.write(video_bytes)

            meta_map = load_metadata()
            meta_entry = {
                "filename": fname,
                "createdAt": now.strftime("%Y-%m-%d %H:%M:%S"),
                "teamId": team_id,
                "teamName": team_name,
                "university": university,
                "trialIndex": trial_index,
                "trialLabel": trial_label,
                "finalScore": final_score,
                "rawScore": raw_score,
                "finishTimeSec": finish_time_sec,
                "durationSec": duration_sec,
                "trigger": trigger
            }
            meta_map[fname] = meta_entry
            save_metadata(meta_map)

            print(f"[SAVED] Rekaman tersimpan: {fpath} ({len(video_bytes)} bytes)")
            return self.send_json({
                "ok": True,
                "recording": {
                    **meta_entry,
                    "url": "/recordings/" + urllib.parse.quote(fname),
                    "sizeBytes": len(video_bytes)
                }
            })
        except Exception as e:
            return self.send_json({"ok": False, "error": str(e)}, status=500)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/recordings":
            return self.send_json({"ok": False, "error": "Endpoint tidak ditemukan"}, status=404)

        qs = urllib.parse.parse_qs(parsed.query)
        fname = os.path.basename(qs.get("file", [""])[0])
        if not fname:
            return self.send_json({"ok": False, "error": "Nama file tidak valid"}, status=400)

        fpath = os.path.join(RECORDINGS_DIR, fname)
        try:
            if os.path.isfile(fpath):
                os.remove(fpath)
            meta_map = load_metadata()
            if fname in meta_map:
                del meta_map[fname]
                save_metadata(meta_map)
            return self.send_json({"ok": True, "deleted": fname})
        except Exception as e:
            return self.send_json({"ok": False, "error": str(e)}, status=500)


if __name__ == "__main__":
    lan_ips = get_lan_ips()
    primary_ip = lan_ips[0]
    print("=" * 72)
    print("  KSTI 2026 - SEARCH AND RESCUE (SAR) | LAN & VIDEO RECORDING SERVER")
    print("=" * 72)
    print(f"  Folder Penyimpanan Rekaman : {RECORDINGS_DIR}")
    print(f"  Akses Lokal (Komputer Ini) : http://localhost:{PORT}/index.html")
    print(f"  Web Cek Rekaman (Lokal)    : http://localhost:{PORT}/recordings.html")
    print("-" * 72)
    print("  AKSES DARI PERANGKAT LAIN DI JARINGAN LOKAL / WI-FI YANG SAMA (LAN):")
    for ip in lan_ips:
        print(f"  -> Web Cek Video Rekaman   : http://{ip}:{PORT}/recordings.html")
        print(f"  -> Panel Operator & Juri   : http://{ip}:{PORT}/index.html")
        print(f"  -> Layar Proyektor Display : http://{ip}:{PORT}/display.html")
    print("=" * 72)
    sys.stdout.flush()

    server = ThreadingHTTPServer(("0.0.0.0", PORT), KSTISARRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
        server.server_close()
