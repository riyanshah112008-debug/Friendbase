#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "[ERROR] .env file not found. Create it first with your Discord token and config."
  exit 1
fi

mkdir -p logs

if ! command -v node >/dev/null 2>&1; then
  echo "[INFO] Installing Node.js and needed packages..."
  pkg update -y
  pkg install -y nodejs git ffmpeg build-essential python openssl wget
fi

if [ ! -d node_modules ]; then
  echo "[INFO] Installing npm dependencies..."
  npm install
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

pm2 delete friendbase >/dev/null 2>&1 || true
pm2 start "node src/index.js" --name friendbase --log /data/data/com.termux/files/home/Friendbase-main/logs/friendbase.log
pm2 save

echo "[OK] Friendbase is running under PM2."
echo "[INFO] Check logs: pm2 logs friendbase"
echo "[INFO] Restart: pm2 restart friendbase"
echo "[INFO] Stop: pm2 stop friendbase"
