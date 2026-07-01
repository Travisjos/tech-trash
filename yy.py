#!/usr/bin/env python3
"""
==================================================
  Smart Dustbin — Waste Classifier
  Raspberry Pi + TFLite + Servo + Ultrasonic
  Classes    : Biodegradable / Non-Biodegradable
  Servo Pin  : GPIO 17
  Trig Pin   : GPIO 23
  Echo Pin   : GPIO 24
==================================================
"""

import time
import os
import numpy as np
import cv2
import tflite_runtime.interpreter as tflite
import RPi.GPIO as GPIO

# ─────────────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────────────

MODEL_PATH        = "tflite-model/tflite_learn.tflite"
IMAGE_SIZE        = (96, 96)
LABELS            = ["Biodegradable", "Non_Biodegradable"]
CONFIDENCE_MIN    = 0.70
FRAME_PATH        = "/tmp/frame.jpg"   # written continuously by cam.py
MAX_FRAME_AGE     = 0.5                # seconds — reject frame if older than this

# Ultrasonic
TRIG_PIN          = 23
ECHO_PIN          = 24
DISTANCE_TRIGGER  = 15

# Servo
SERVO_PIN         = 17
SERVO_FREQ        = 50
ANGLE_REST        = 0
ANGLE_BIO         = 90
ANGLE_NON_BIO     = -90
LID_OPEN_TIME     = 2.0

# ─────────────────────────────────────────────────────
#  SERVO
# ─────────────────────────────────────────────────────

def angle_to_duty(angle):
    duty = 7.5 + (angle / 18.0)
    return max(2.5, min(12.5, duty))

def set_servo_angle(servo, angle, label=""):
    servo.ChangeDutyCycle(angle_to_duty(angle))
    if label:
        print(f"  [SERVO] Moving to {angle}° ({label})")
    time.sleep(0.5)
    servo.ChangeDutyCycle(0)

def open_lid_biodegradable(servo):
    print("  [SERVO] Opening Biodegradable lid →")
    set_servo_angle(servo, ANGLE_BIO, "open lid 1")
    time.sleep(LID_OPEN_TIME)
    set_servo_angle(servo, ANGLE_REST, "back to rest")
    print("  [SERVO] Lid closed. Ready.\n")

def open_lid_non_biodegradable(servo):
    print("  [SERVO] Opening Non-Biodegradable lid ←")
    set_servo_angle(servo, ANGLE_NON_BIO, "open lid 2")
    time.sleep(LID_OPEN_TIME)
    set_servo_angle(servo, ANGLE_REST, "back to rest")
    print("  [SERVO] Lid closed. Ready.\n")

# ─────────────────────────────────────────────────────
#  ULTRASONIC
# ─────────────────────────────────────────────────────

def get_distance():
    timeout = time.time() + 0.1
    GPIO.output(TRIG_PIN, True)
    time.sleep(0.00001)
    GPIO.output(TRIG_PIN, False)

    pulse_start = time.time()
    pulse_end   = time.time()

    while GPIO.input(ECHO_PIN) == 0:
        pulse_start = time.time()
        if pulse_start > timeout:
            return None

    while GPIO.input(ECHO_PIN) == 1:
        pulse_end = time.time()
        if pulse_end > timeout:
            return None

    return round((pulse_end - pulse_start) * 17150, 2)

# ─────────────────────────────────────────────────────
#  GPIO SETUP
# ─────────────────────────────────────────────────────

def setup_gpio():
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(TRIG_PIN, GPIO.OUT)
    GPIO.setup(ECHO_PIN, GPIO.IN)
    GPIO.output(TRIG_PIN, False)
    GPIO.setup(SERVO_PIN, GPIO.OUT)

    servo = GPIO.PWM(SERVO_PIN, SERVO_FREQ)
    servo.start(0)
    print("[INFO] Moving servo to rest position (0°)...")
    set_servo_angle(servo, ANGLE_REST, "startup")
    time.sleep(1)
    print("[INFO] GPIO ready.")
    return servo

# ─────────────────────────────────────────────────────
#  CAMERA — reads frames written by the separate cam.py process
# ─────────────────────────────────────────────────────

def read_fresh_frame(frame_path, max_age):
    """
    Read the latest frame written by cam.py, but reject it if it's
    older than max_age seconds. cam.py writes a new frame roughly
    every 0.1s, so a frame older than that means something's wrong
    (cam.py stalled/crashed) and we shouldn't classify a stale image.
    """
    if not os.path.exists(frame_path):
        return None

    age = time.time() - os.path.getmtime(frame_path)
    if age > max_age:
        print(f"[WARN] Frame is {age:.2f}s old (> {max_age}s) — is cam.py still running?")
        return None

    frame = cv2.imread(frame_path)
    return frame

def center_crop_square(image):
    """
    Crop the frame to a centered square before resizing, instead of
    squashing the whole rectangular scene. This matches the tight,
    single-object framing your training images used, rather than
    distorting a wide background+object scene into 96x96.
    """
    h, w = image.shape[:2]
    side = min(h, w)
    top  = (h - side) // 2
    left = (w - side) // 2
    return image[top:top + side, left:left + side]

# ─────────────────────────────────────────────────────
#  MODEL — EXACTLY same as original working version
# ─────────────────────────────────────────────────────

def load_model(model_path):
    interpreter = tflite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    return (interpreter,
            interpreter.get_input_details(),
            interpreter.get_output_details())

def detect_model_type(input_details):
    dtype = input_details[0]['dtype']
    if dtype == np.float32:
        print("[INFO] Model type: Float32 (unquantized)")
        return "float32"
    elif dtype == np.int8:
        print("[INFO] Model type: Int8 (quantized)")
        return "int8"
    elif dtype == np.uint8:
        print("[INFO] Model type: UInt8 (quantized)")
        return "uint8"
    else:
        print(f"[WARN] Unknown dtype {dtype}, defaulting to float32")
        return "float32"

def preprocess_image(image_bgr, image_size, model_type, input_details):
    """
    Convert BGR → RGB, center-crop to square, resize, normalize.
    cv2.imread always decodes JPEGs as BGR regardless of how they
    were originally written, so this conversion is required.
    """
    # Convert BGR (OpenCV) to RGB
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    # Center-crop to a square so resizing doesn't stretch/distort the object
    cropped = center_crop_square(image_rgb)

    # Resize to model input size
    resized = cv2.resize(cropped, image_size)

    if model_type == "float32":
        input_data = np.array(resized, dtype=np.float32) / 255.0

    elif model_type == "int8":
        scale, zero_point = input_details[0]['quantization']
        if scale == 0:
            input_data = np.array(resized, dtype=np.int8) - 128
        else:
            input_data = (resized / 255.0 / scale + zero_point).astype(np.int8)

    elif model_type == "uint8":
        input_data = np.array(resized, dtype=np.uint8)

    # Add batch dimension
    return np.expand_dims(input_data, axis=0)

def sigmoid(x):
    x = np.clip(x, -500, 500)
    return 1.0 / (1.0 + np.exp(-x))

def classify(interpreter, input_details, output_details,
             input_data, model_type):
    """
    EXACTLY same classify logic as original working classify.py.
    """
    interpreter.set_tensor(input_details[0]['index'], input_data)
    interpreter.invoke()
    output_data = interpreter.get_tensor(output_details[0]['index'])

    raw = float(output_data[0][0])

    # Apply sigmoid only for raw logit outputs
    if model_type == "float32" and output_details[0]['dtype'] == np.float32:
        if not (0.0 <= raw <= 1.0):
            probability = sigmoid(raw)
        else:
            probability = raw
    else:
        scale, zero_point = output_details[0]['quantization']
        if scale != 0:
            probability = sigmoid((raw - zero_point) * scale)
        else:
            probability = sigmoid(raw)

    # probability > 0.5 → Non-Biodegradable (class 1)
    # probability ≤ 0.5 → Biodegradable     (class 0)
    if probability > 0.5:
        label      = LABELS[1]   # Non-Biodegradable
        confidence = probability
    else:
        label      = LABELS[0]   # Biodegradable
        confidence = 1.0 - probability

    return label, confidence, probability

# ─────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────

def main():
    print("=" * 55)
    print("   Smart Dustbin — Waste Classifier")
    print("=" * 55)

    # Load model
    print(f"\n[INFO] Loading model: {MODEL_PATH}")
    try:
        interpreter, input_details, output_details = load_model(MODEL_PATH)
    except Exception as e:
        print(f"[ERROR] Could not load model: {e}")
        return

    model_type = detect_model_type(input_details)
    print(f"[INFO] Input shape : {input_details[0]['shape']}")
    print(f"[INFO] Output shape: {output_details[0]['shape']}")

    # Setup GPIO
    print("\n[INFO] Setting up GPIO...")
    servo = setup_gpio()

    print(f"\n[INFO] Minimum confidence : {int(CONFIDENCE_MIN*100)}%")
    print(f"[INFO] Detection distance : {DISTANCE_TRIGGER}cm")
    print(f"[INFO] Frame source       : {FRAME_PATH} (written by cam.py)")
    print(f"\n[INFO] System ready! Waiting for object...")
    print("  Press Ctrl+C to stop.\n")
    print("─" * 55)

    try:
        while True:
            # Step 1: Read ultrasonic distance
            distance = get_distance()
            if distance is None:
                time.sleep(0.2)
                continue

            # Step 2: Object within range?
            if distance <= DISTANCE_TRIGGER:
                print(f"\n[DETECT] Object at {distance}cm!")
                time.sleep(0.3)   # let camera capture the object

                # Step 3: Read the latest frame written by cam.py (reject if stale)
                frame = read_fresh_frame(FRAME_PATH, MAX_FRAME_AGE)
                if frame is None:
                    print("[WAIT] No fresh camera frame, skipping...")
                    time.sleep(0.5)
                    continue

                # Step 4: Preprocess & classify
                input_data = preprocess_image(
                    frame, IMAGE_SIZE, model_type, input_details
                )
                label, confidence, probability = classify(
                    interpreter, input_details, output_details,
                    input_data, model_type
                )

                # Step 5: Print result
                bar = "█" * int(confidence * 20)
                print(f"  Result    : {label}")
                print(f"  Confidence: {confidence * 100:.1f}%  [{bar:<20}]")
                print(f"  Raw prob  : {probability:.4f}")

                # Step 6: Act only if confidence >= 70%
                if confidence >= CONFIDENCE_MIN:
                    if label == LABELS[0]:      # Biodegradable
                        print(f"  ✅ {confidence*100:.1f}% → Opening Biodegradable lid")
                        open_lid_biodegradable(servo)
                    else:                        # Non-Biodegradable
                        print(f"  ✅ {confidence*100:.1f}% → Opening Non-Biodegradable lid")
                        open_lid_non_biodegradable(servo)

                    time.sleep(2)   # wait before scanning again

                else:
                    print(f"  ⚠️  Low confidence ({confidence*100:.1f}%) — below 70%, skipping.")
                    print("  Please reposition the object.\n")
                    time.sleep(1)

            else:
                time.sleep(0.2)

    except KeyboardInterrupt:
        print("\n\n[INFO] Stopped by user.")

    finally:
        print("[INFO] Resetting servo to 0°...")
        set_servo_angle(servo, ANGLE_REST, "shutdown")
        servo.stop()
        GPIO.cleanup()
        print("[INFO] GPIO cleaned up. Goodbye!")


if __name__ == "__main__":
    main()
