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
import json
import time
import socket
import urllib.parse
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("KSTI_PORT", "8080"))
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
RECORDINGS_DIR = os.path.join(ROOT_DIR, "recordings")
METADATA_FILE = os.path.join(RECORDINGS_DIR, "metadata.json")
SCORE_CSV_FILE = os.path.join(ROOT_DIR, "Skor KSTI Robotics 2026 - SAR.csv")

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

                with open(SCORE_CSV_FILE, "w", encoding="utf-8", newline="") as f:
                    f.write(csv_text)

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
