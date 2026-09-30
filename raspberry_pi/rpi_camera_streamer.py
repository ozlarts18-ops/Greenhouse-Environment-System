#!/usr/bin/env python3
"""
================================================================================
Smart Greenhouse Automation System — Raspberry Pi Remote USB Camera Streamer
================================================================================
Captures live optical video frames from the physically attached USB Camera
(/dev/video0) on the Raspberry Pi at college and pushes them outbound over HTTP
to the Cloud Backend (/api/camera/frame).

Advantages:
  * No router port-forwarding needed at college
  * Works behind college NAT / firewall / Wi-Fi / hotspot
  * Home dashboard connects to Cloud MJPEG stream (/api/camera/stream)
  * Crop AI & Pest AI can diagnose frames directly without WebRTC or open ports
================================================================================
"""

import os
import sys
import time
import argparse
import requests

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("[ERROR] OpenCV (cv2) is not installed. Install with: pip3 install opencv-python-headless")

DEFAULT_SERVER_URL = os.environ.get("GREENHOUSE_CAMERA_URL", "http://localhost:5000/api/camera/frame")
DEFAULT_CAMERA_INDEX = int(os.environ.get("CAMERA_INDEX", 0))
DEFAULT_FPS = float(os.environ.get("CAMERA_FPS", 3.0)) # 3 frames per second is optimal for low-bandwidth remote streaming
DEFAULT_WIDTH = int(os.environ.get("CAMERA_WIDTH", 640))
DEFAULT_HEIGHT = int(os.environ.get("CAMERA_HEIGHT", 480))
DEFAULT_QUALITY = int(os.environ.get("JPEG_QUALITY", 75))

parser = argparse.ArgumentParser(description="Raspberry Pi USB Camera Outbound Streamer")
parser.add_argument("--url", type=str, default=DEFAULT_SERVER_URL,
                    help=f"Target cloud camera ingestion URL (default: {DEFAULT_SERVER_URL})")
parser.add_argument("--device", type=int, default=DEFAULT_CAMERA_INDEX,
                    help=f"V4L2 camera device index (default: {DEFAULT_CAMERA_INDEX})")
parser.add_argument("--fps", type=float, default=DEFAULT_FPS,
                    help=f"Target streaming frames per second (default: {DEFAULT_FPS})")
parser.add_argument("--width", type=int, default=DEFAULT_WIDTH,
                    help=f"Capture resolution width (default: {DEFAULT_WIDTH})")
parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT,
                    help=f"Capture resolution height (default: {DEFAULT_HEIGHT})")
args, _ = parser.parse_known_args()

TARGET_URL = args.url
CAMERA_IDX = args.device
TARGET_FPS = args.fps
FRAME_INTERVAL = 1.0 / max(0.5, TARGET_FPS)

def run_streamer():
    if not CV2_AVAILABLE:
        print("[FATAL] Cannot run camera streamer without OpenCV. Exiting.")
        sys.exit(1)

    print("\n========================================================")
    print(" 📷 SMART GREENHOUSE — REMOTE USB CAMERA STREAMER")
    print("========================================================")
    print(f" Camera Index : /dev/video{CAMERA_IDX}")
    print(f" Cloud Target : {TARGET_URL}")
    print(f" Stream Rate  : {TARGET_FPS} FPS ({args.width}x{args.height}, Q={DEFAULT_QUALITY}%)")
    print("========================================================\n")

    session = requests.Session()

    while True:
        print(f"[CAMERA] Opening camera device /dev/video{CAMERA_IDX}...")
        cap = cv2.VideoCapture(CAMERA_IDX)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)

        if not cap.isOpened():
            print(f"[CAMERA] ⚠ Failed to open camera device /dev/video{CAMERA_IDX}. Retrying in 5 seconds...")
            time.sleep(5)
            continue

        print(f"[CAMERA] ✓ USB Camera successfully opened. Streaming to cloud...")

        consecutive_errors = 0

        while True:
            start_time = time.time()
            ret, frame = cap.read()

            if not ret or frame is None:
                consecutive_errors += 1
                if consecutive_errors > 5:
                    print("[CAMERA] ⚠ Lost camera frame stream. Re-initializing device...")
                    break
                time.sleep(0.5)
                continue

            consecutive_errors = 0

            # Encode frame to JPEG
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), DEFAULT_QUALITY]
            success, encoded_img = cv2.imencode('.jpg', frame, encode_param)

            if not success:
                continue

            jpeg_bytes = encoded_img.tobytes()

            try:
                # Push frame outbound to cloud backend
                files = {'frame': ('frame.jpg', jpeg_bytes, 'image/jpeg')}
                res = session.post(TARGET_URL, files=files, timeout=3.0)
                if res.status_code == 200:
                    pass
                else:
                    print(f"[STREAM] Cloud returned HTTP {res.status_code}")
            except requests.exceptions.RequestException:
                # Network hiccup, backoff cleanly
                pass

            # Maintain constant FPS
            elapsed = time.time() - start_time
            sleep_time = max(0.01, FRAME_INTERVAL - elapsed)
            time.sleep(sleep_time)

        cap.release()
        time.sleep(2)

if __name__ == "__main__":
    try:
        run_streamer()
    except KeyboardInterrupt:
        print("\nCamera streamer stopped by operator.")
