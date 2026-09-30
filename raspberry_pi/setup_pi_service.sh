#!/bin/bash
# ==============================================================================
# Smart Greenhouse Automation — Raspberry Pi Setup & Autostart Installer
# ==============================================================================
set -e

echo "=========================================================="
echo " 🌿 Smart Greenhouse Automation System — Raspberry Pi Setup"
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run as root: sudo bash setup_pi_service.sh <YOUR_SERVER_URL>"
  exit 1
fi

SERVER_URL=${1:-"http://YOUR_SERVER_IP:5000"}

echo "[+] Installing system dependencies..."
apt-get update -y
apt-get install -y python3 python3-pip python3-opencv libatlas-base-dev

echo "[+] Installing Python hardware libraries..."
pip3 install requests RPi.GPIO adafruit-circuitpython-bh1750 adafruit-circuitpython-dht adafruit-circuitpython-ads1x15 RPLCD

mkdir -p /home/pi/greenhouse
cp rpi_greenhouse_gateway.py /home/pi/greenhouse/
cp rpi_camera_streamer.py /home/pi/greenhouse/
chown -R pi:pi /home/pi/greenhouse
chmod +x /home/pi/greenhouse/*.py

echo "[+] Configuring systemd services for automatic startup after reboot..."
sed -i "s|http://YOUR_SERVER_IP:5000|$SERVER_URL|g" smart-greenhouse.service
sed -i "s|http://YOUR_SERVER_IP:5000|$SERVER_URL|g" smart-greenhouse-camera.service

cp smart-greenhouse.service /etc/systemd/system/
cp smart-greenhouse-camera.service /etc/systemd/system/

systemctl daemon-reload
systemctl enable smart-greenhouse.service
systemctl enable smart-greenhouse-camera.service

systemctl restart smart-greenhouse.service
systemctl restart smart-greenhouse-camera.service

echo "=========================================================="
echo "✓ Smart Greenhouse Edge Controller & Camera Services Installed & Active!"
echo "✓ Services will automatically start on every Raspberry Pi boot."
echo "Check status anytime with:"
echo "  sudo systemctl status smart-greenhouse.service"
echo "  sudo systemctl status smart-greenhouse-camera.service"
echo "=========================================================="
