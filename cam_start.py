#!/usr/bin/env python3
"""
==================================================
  Smart Dustbin — Camera Capture Loop
  Runs continuously in its own terminal, writing
  the latest frame to /tmp/frame.jpg for classify.py
  to read.
==================================================
"""

import os
import time
from picamera2 import Picamera2

FRAME_PATH = "/tmp/frame.jpg"
TEMP_PATH  = "/tmp/frame_tmp.jpg"   # write here first, then atomically rename

camera = Picamera2()
camera.start()
print("Camera is running...")
print("Press CTRL+C to stop...")

try:
    while True:
        # Write to a temp file first, then rename. os.rename() is atomic on
        # the same filesystem, so classify.py can never read a half-written
        # (corrupt/garbage) JPEG — it only ever sees a complete file.
        camera.capture_file(TEMP_PATH)
        os.rename(TEMP_PATH, FRAME_PATH)
        time.sleep(0.1)

except KeyboardInterrupt:
    print("\nStopping camera...")
    camera.stop()
    print("Camera closed!")
