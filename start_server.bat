@echo off
title KSTI 2026 SAR - Server Rekaman Kamera & Akses LAN
cd /d "%~dp0"

if not exist "recordings" mkdir "recordings"

echo Menjalankan Server Rekaman Kamera & LAN KSTI 2026 SAR...
echo.

if exist "C:\msys64\ucrt64\bin\python.exe" (
    start "" "http://localhost:8080/index.html"
    "C:\msys64\ucrt64\bin\python.exe" server.py
) else (
    start "" "http://localhost:8080/index.html"
    python server.py
)

pause
