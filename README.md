# KSTI 2026 - Kontes Robot Search and Rescue (SAR)

Aplikasi web terpadu untuk **Operator Cockpit**, **Layar Proyektor Penonton (Display)**, **Perekaman Video Kamera Pertandingan**, serta **Portal Evaluasi Rekaman Video Juri berbasis LAN/Wi-Fi** pada kompetisi **Kontes Robot SAR - KSTI 2026**.

---

## 📌 Fitur Utama

1. **Panel Kontrol Operator & Juri (`index.html`)**
   - **Checklist Penilaian Real-Time**: Penilaian otomatis sesuai Buku Panduan SAR KSTI 2026 (Keluar Wilayah START, 5 Misi Penyelamatan K-1 s/d K-5 menuju SZ-1 s/d SZ-5, Rintangan R1 dan R2, serta Poin Finish).
   - **Timer Terpisah**: Timer Persiapan (3 menit / 180s) dan Timer Lomba (5 menit / 300s) dengan akurasi tinggi serta pencatatan Retry.
   - **Otomatisasi Finish & Rumus Bonus**: Saat Finish dicentang, Timer Lomba otomatis berhenti seketika dan rumus bonus dihitung akurat:
     $$\text{Skor Akhir} = \text{round}\left(\text{Skor Misi} \times \frac{300}{\text{Waktu Selesai (detik)}}\right)$$
   - **Pengundi Korban (Victim Randomizer)**: Pengacakan posisi korban asli dan dummy untuk Ruang K-1 (3 posisi) dan Ruang K-2 (2 posisi) dengan visualisasi pada peta arena interaktif.
   - **Rekap Skor 12 Tim**: Rekap skor 3 percobaan (P1, P2, P3) dengan penentuan peringkat berdasarkan skor terbaik dan ekspor rekap ke format CSV.

2. **Layar Tampilan Proyektor / Penonton (`display.html`)**
   - Tampilan bersih rasio 16:9 tanpa kontrol operator untuk proyektor venue lomba.
   - Sinkronisasi instan dua arah melalui `BroadcastChannel API` dan `localStorage`.
   - Multi-scene broadcast:
     - **Live Match**: Kamera arena tunggal berdampingan dengan Timer Lomba dan Skor berjalan.
     - **Peta Undian**: Peta denah arena dengan posisi korban K-1 & K-2.
     - **Daftar Tim**: Rekap 12 tim peserta.
     - **Papan Skor**: Rincian poin per misi dan klasemen peringkat.
     - **Sesaat Lagi & Istirahat**: Layar jeda sesi dan ISHOMA.
     - **Winner**: Panggung selebrasi pemenang otomatis atau manual.
     - **Title Screen**: Layar pembuka resmi KSTI 2026 SAR Nasional.

3. **Kamera Tanpa Kabel (Wireless) & Fitur VAR YouTube Live**
   - **2 Opsi Kamera Nirkabel Smartphone**:
     - **Opsi 1 (Utama)**: *Link to Windows* (Phone Link / Connected Camera bawaan Windows).
     - **Opsi 2 (Cadangan)**: *Iriun Webcam* (kamera Wi-Fi cepat untuk Android & iOS).
     - Pendeteksian otomatis status perangkat (*Terhubung/Belum*) dan tombol sekali klik untuk berpindah kamera saat lomba.
   - **Sistem VAR & DVR Mirip YouTube Live**:
     - Linimasa video pertandingan yang dapat dimundurkan (*rewind*) kapan saja untuk review juri (misal: `-5s`, `-15s`, `-30s`).
     - Badge status: `🔴 LIVE` saat real-time, dan berubah menjadi indikator timestamp abu-abu `⚪ -00:15` saat dimundurkan.
     - **Kembali ke LIVE Instan**: Menggeser slider ke detik terbaru atau mengeklik tombol `LIVE` langsung mengembalikan tayangan ke siaran langsung tanpa jeda.
     - Fitur evaluasi juri: *Slow-motion* (`0.25x`, `0.5x`, `1.0x`), lompat frame (`-1s`, `+1s`, `-5s`, `+5s`), serta watermark `🔴 VAR REVIEW`.
     - Sinkronisasi VAR antara Panel Operator dan Layar Proyektor Penonton.

4. **Perekaman Kamera Otomatis & Manual**
   - Perekaman video kamera lokal/nirkabel arena (`MediaRecorder API`).
   - Otomatis mulai merekam saat Timer Lomba berjalan dan otomatis berhenti serta tersimpan saat Finish dicentang atau waktu berakhir.
   - File rekaman otomatis tersimpan ke folder lokal `recordings/` dengan metadata tim, sesi percobaan, skor, dan waktu tempuh.

5. **Server & Portal Rekaman Video LAN (`recordings.html` & `server.py`)**
   - Server lokal ringan berbasis Python standard library (`server.py`).
   - Dukungan *HTTP 206 Partial Content (Range Request)* untuk kelancaran *scrubbing* dan *seeking* video di semua browser.
   - Portal web responsif untuk juri/panitia memeriksa video rekaman dari HP, tablet, atau laptop lain dalam satu jaringan Wi-Fi/LAN yang sama:
     - Kontrol kecepatan putar (*slow-motion* `0.25x`, `0.5x`, `1.0x`, `2.0x`).
     - Lompatan detik frame demi frame (`-5s`, `-1s`, `+1s`, `+5s`).
     - Filter pencarian berdasarkan nama tim dan sesi percobaan.

---

## 🚀 Panduan Menjalankan

### Cara 1: Menggunakan Skrip Windows Batch (Rekomendasi)
Cukup klik dua kali file:
```cmd
start_server.bat
```
Browser akan otomatis membuka `http://localhost:8080/index.html` dan server LAN akan berjalan.

### Cara 2: Menjalankan Server Python Manual
```bash
python server.py
```
atau (bila menggunakan MSYS2/UCRT64):
```bash
C:\msys64\ucrt64\bin\python.exe server.py
```

Setelah server aktif, terminal akan menampilkan alamat URL akses lokal dan LAN:
- **Panel Operator (Lokal)**: `http://localhost:8080/index.html`
- **Layar Display Proyektor**: `http://localhost:8080/display.html`
- **Portal Rekaman Video (Lokal)**: `http://localhost:8080/recordings.html`
- **Akses dari Perangkat Lain (Wi-Fi/LAN yang Sama)**: `http://<IP_LAN_KOMPUTER>:8080/recordings.html`

---

## 📁 Struktur Direktori

```text
├── assets/
│   ├── ksti_cover_logo.png        # Logo resmi KSTI 2026
│   ├── partner_logos.png          # Logo mitra & kementerian
│   └── pdf_images/
│       └── flate_11_1723x828.png  # Peta denah arena SAR KSTI 2026
├── css/
│   └── styles.css                 # Desain sistem & styling broadcast
├── js/
│   ├── arena.js                   # Visualisasi SVG denah arena SAR
│   ├── broadcast_renderer.js      # Generator HTML scene proyektor
│   ├── display.js                 # Kontrol layar proyektor
│   ├── dvr.js                     # Engine YouTube Live DVR & VAR
│   ├── operator.js                # Logika penilaian, timer & perekaman
│   └── state.js                   # State management & rumus skor
├── recordings/                    # Folder penyimpanan file video rekaman
│   └── .gitkeep
├── Daftar KSTI Robotics 2026 - SAR.csv            # Daftar 12 tim resmi
├── Rundown Robotics Competition KSTI 2026 - SAR.csv # Rundown giliran tampil
├── GUIDEBOOK_SAR_KSTI 2026.1.pdf                  # Buku panduan lomba
├── display.html                   # Halaman display proyektor (16:9)
├── index.html                     # Halaman panel operator utama
├── recordings.html                # Halaman portal rekaman video LAN
├── server.py                      # Server HTTP & API rekaman video
├── start_server.bat               # Skrip peluncur cepat Windows
├── .gitignore
└── README.md
```

---

## 📋 Catatan Regulasi Skor Finish (Guidebook Bab III.F.4)
Robot dinyatakan menyelesaikan misi (*Finish*) jika berhasil menempatkan diri pada area Finish sebelum waktu 300 detik habis. Perhitungan skor akhir dengan bonus dihitung menggunakan:
$$\text{Total Skor Akhir} = \text{round}\left(\text{Total Skor Misi} \times \frac{300}{\text{Waktu Tempuh (detik)}}\right)$$
Jika robot tidak mencapai finish sebelum waktu habis ($t \ge 300$), nilai akhir adalah akumulasi nilai misi tanpa pengali bonus waktu.
