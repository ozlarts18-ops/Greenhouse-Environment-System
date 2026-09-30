#!/usr/bin/env python3
"""
================================================================================
Smart Greenhouse Automation System — Raspberry Pi Edge Controller & Cloud Gateway
================================================================================
Architecture:
  * Centralized GPIO configuration via gpio_config.py
  * Deployed on Raspberry Pi 3/4/5 at College / Remote Location
  * Outbound Cloud Sync over HTTP/HTTPS (No router port-forwarding required)
  * Offline Edge Autonomy: Continues executing all automation hysteresis loops locally
  * Full Actuator Loop: Dashboard -> Cloud Queue -> Pi Sync -> GPIO -> Confirmation -> Cloud -> Dashboard
================================================================================
"""

import os
import sys
import copy
import signal
import threading
import time
import argparse
from datetime import datetime
import requests

# Import centralized GPIO configuration
try:
    from gpio_config import (
        GPIO_CONFIG,
        RELAY_ACTIVE_LOW,
        AUTOMATION_THRESHOLDS,
        VALID_BCM_GPIOS,
        validate_gpio_config,
        print_gpio_summary,
    )
except ImportError:
    # Fallback if imported from parent folder
    from raspberry_pi.gpio_config import (
        GPIO_CONFIG,
        RELAY_ACTIVE_LOW,
        AUTOMATION_THRESHOLDS,
        VALID_BCM_GPIOS,
        validate_gpio_config,
        print_gpio_summary,
    )

# Try importing hardware libraries
try:
    import board
    import busio
    import RPi.GPIO as GPIO
    import adafruit_bh1750
    import adafruit_dht
    import adafruit_ads1x15.ads1115 as ADS
    from adafruit_ads1x15.analog_in import AnalogIn
    from RPLCD.i2c import CharLCD
    ON_RASPBERRY_PI = True
except ImportError as e:
    print(f"[WARN] Hardware library not available ({e}). Running in simulation mode.")
    ON_RASPBERRY_PI = False

# ==============================================================================
# CONFIGURATION & THRESHOLDS (Imported from gpio_config)
# ==============================================================================
DEFAULT_GATEWAY_URL = os.environ.get("GREENHOUSE_GATEWAY_URL", "http://localhost:5000/api/sensors/gateway")
GATEWAY_SYNC_INTERVAL = float(os.environ.get("GREENHOUSE_SYNC_INTERVAL", "2.0"))

# Active Pin Assignments
LIGHT_RELAY = GPIO_CONFIG["GROW_LIGHT_RELAY"]
TANK_TRIG = GPIO_CONFIG["TANK_TRIG"]
TANK_ECHO = GPIO_CONFIG["TANK_ECHO"]
TANK_RELAY = GPIO_CONFIG["TANK_MOTOR_RELAY"]
PUMP_RELAY = GPIO_CONFIG["SOIL_PUMP_RELAY"]
DHT_BCM_PIN = GPIO_CONFIG["DHT22_DATA"]
FAN_RELAY = GPIO_CONFIG["FAN_RELAY"]
LCD_ADDRESS = 0x27

# Hysteresis Thresholds
LIGHT_ON_BELOW = AUTOMATION_THRESHOLDS["LIGHT_ON_BELOW_LUX"]
LIGHT_OFF_ABOVE = AUTOMATION_THRESHOLDS["LIGHT_OFF_ABOVE_LUX"]
TANK_FULL_CM = AUTOMATION_THRESHOLDS["TANK_FULL_STOP_CM"]
DRY_THRESHOLD = AUTOMATION_THRESHOLDS["SOIL_DRY_THRESHOLD_ADC"]
PUMP_TIME = AUTOMATION_THRESHOLDS["SOIL_WATERING_SECONDS"]
SOAK_TIME = AUTOMATION_THRESHOLDS["SOIL_SOAK_COOLDOWN_SECONDS"]
FAN_ON_TEMP = AUTOMATION_THRESHOLDS["FAN_ON_TEMP_CELSIUS"]
FAN_OFF_TEMP = AUTOMATION_THRESHOLDS["FAN_OFF_TEMP_CELSIUS"]

LIGHT_INTERVAL = 2.0
TANK_INTERVAL = 1.0
SOIL_INTERVAL = 30.0
CLIMATE_INTERVAL = 2.5

# ==============================================================================
# CLI ARGUMENTS
# ==============================================================================
parser = argparse.ArgumentParser(description="Smart Greenhouse Edge Controller")
parser.add_argument("--gateway", type=str, default=DEFAULT_GATEWAY_URL,
                    help="Target cloud backend gateway URL (e.g. http://<CLOUD_IP>:5000/api/sensors/gateway)")
parser.add_argument("--sync-interval", type=float, default=GATEWAY_SYNC_INTERVAL,
                    help="Seconds between cloud gateway syncs (default: 2.0)")
cli_args, _ = parser.parse_known_args()
GATEWAY_URL = cli_args.gateway
SYNC_INTERVAL = cli_args.sync_interval

# ==============================================================================
# SHARED STATE
# ==============================================================================
stop_event = threading.Event()
state_lock = threading.Lock()

state = {
    "light": {
        "lux": 0.0,
        "light_status": "OFF",
        "mode": "AUTO",
        "gpio_pin": LIGHT_RELAY,
        "sensor_ok": False,
        "timestamp": None,
    },
    "tank": {
        "distance_cm": None,
        "motor": "OFF",
        "mode": "AUTO",
        "trig_pin": TANK_TRIG,
        "echo_pin": TANK_ECHO,
        "relay_pin": TANK_RELAY,
        "sensor_ok": False,
        "timestamp": None,
    },
    "soil": {
        "raw": None,
        "voltage": None,
        "soil": "UNKNOWN",
        "pump": "OFF",
        "mode": "AUTO",
        "relay_pin": PUMP_RELAY,
        "sensor_ok": False,
        "timestamp": None,
    },
    "climate": {
        "temperature": None,
        "humidity": None,
        "fan": "OFF",
        "mode": "AUTO",
        "dht_pin": DHT_BCM_PIN,
        "relay_pin": FAN_RELAY,
        "sensor_ok": False,
        "timestamp": None,
    },
    "relays": {
        "GROW_LIGHT": "OFF",
        "TANK_MOTOR": "OFF",
        "SOIL_PUMP": "OFF",
        "FAN": "OFF",
    },
    "gateway": {
        "connected": False,
        "last_sync": None,
        "last_status_code": None,
        "url": GATEWAY_URL,
    }
}

def update_section(section, **values):
    with state_lock:
        if section in state:
            state[section].update(values)
            state[section]["timestamp"] = datetime.now().isoformat()

# ==============================================================================
# SAFE GPIO SETUP & RELAY CONTROL
# ==============================================================================
if ON_RASPBERRY_PI:
    GPIO.setwarnings(False)
    GPIO.setmode(GPIO.BCM)

def set_physical_relay(pin, on):
    """Safely switches relay respecting active-low logic."""
    if not ON_RASPBERRY_PI:
        return
    # In Active LOW: GPIO.LOW = Energized (ON), GPIO.HIGH = De-energized (OFF)
    state_to_write = GPIO.LOW if on else GPIO.HIGH
    if not RELAY_ACTIVE_LOW:
        state_to_write = GPIO.HIGH if on else GPIO.LOW
    GPIO.output(pin, state_to_write)

def all_relays_off():
    """Safely de-energizes all physical relays."""
    if not ON_RASPBERRY_PI:
        return
    for pin in (LIGHT_RELAY, TANK_RELAY, PUMP_RELAY, FAN_RELAY):
        try:
            GPIO.output(pin, GPIO.HIGH if RELAY_ACTIVE_LOW else GPIO.LOW)
        except Exception:
            pass

# Initialize GPIO pins safely: Set all outputs to OFF immediately
if ON_RASPBERRY_PI:
    for pin in (LIGHT_RELAY, TANK_RELAY, PUMP_RELAY, FAN_RELAY):
        GPIO.setup(pin, GPIO.OUT, initial=GPIO.HIGH if RELAY_ACTIVE_LOW else GPIO.LOW)
    GPIO.setup(TANK_TRIG, GPIO.OUT, initial=GPIO.LOW)
    GPIO.setup(TANK_ECHO, GPIO.IN)

# Initialize I2C and hardware sensor objects
i2c = None
bh1750 = None
soil_channel = None
lcd = None
dht = None

if ON_RASPBERRY_PI:
    try:
        i2c = busio.I2C(board.SCL, board.SDA)
    except Exception as e:
        print("[INIT] I2C bus error:", e)

    if i2c:
        try:
            bh1750 = adafruit_bh1750.BH1750(i2c)
            print(f"[INIT] BH1750 Lux sensor online on I2C.")
        except Exception as e:
            print("[INIT] BH1750 init failed:", e)

        try:
            soil_channel = AnalogIn(ADS.ADS1115(i2c), 0)
            print(f"[INIT] ADS1115 Soil ADC online on I2C.")
        except Exception as e:
            print("[INIT] ADS1115 init failed:", e)

        try:
            lcd = CharLCD(i2c_expander="PCF8574", address=LCD_ADDRESS, port=1,
                          cols=16, rows=2, dotsize=8)
            lcd.clear()
            print("[INIT] 16x2 LCD display online on I2C.")
        except Exception as e:
            print("[INIT] LCD init bypassed:", e)

    try:
        dht_pin_name = f"D{DHT_BCM_PIN}"
        dht_pin_obj = getattr(board, dht_pin_name, board.D26)
        dht = adafruit_dht.DHT22(dht_pin_obj, use_pulseio=False)
        print(f"[INIT] DHT22 Temp/Humidity online on BCM {DHT_BCM_PIN}.")
    except Exception as e:
        print(f"[INIT] DHT22 init failed on BCM {DHT_BCM_PIN}:", e)

def lcd_write(row, text):
    if lcd is None or not ON_RASPBERRY_PI:
        return
    try:
        lcd.cursor_pos = (row, 0)
        lcd.write_string(text[:16].ljust(16))
    except Exception:
        pass

# ==============================================================================
# EDGE AUTOMATION WORKERS (Operates locally even if disconnected)
# ==============================================================================
def light_worker():
    while not stop_event.is_set():
        try:
            with state_lock:
                mode = state["light"].get("mode", "AUTO")

            if bh1750:
                lux = bh1750.lux
                update_section("light", lux=round(lux, 2), sensor_ok=True)

                if mode == "AUTO":
                    if lux < LIGHT_ON_BELOW:
                        set_physical_relay(LIGHT_RELAY, True)
                        update_section("light", light_status="ON")
                        with state_lock: state["relays"]["GROW_LIGHT"] = "ON"
                    elif lux > LIGHT_OFF_ABOVE:
                        set_physical_relay(LIGHT_RELAY, False)
                        update_section("light", light_status="OFF")
                        with state_lock: state["relays"]["GROW_LIGHT"] = "OFF"
            stop_event.wait(LIGHT_INTERVAL)
        except Exception as e:
            print(f"[LIGHT] error: {e}")
            stop_event.wait(2)

def get_distance():
    if not ON_RASPBERRY_PI:
        return 12.0
    GPIO.output(TANK_TRIG, GPIO.LOW)
    time.sleep(0.05)
    GPIO.output(TANK_TRIG, GPIO.HIGH)
    time.sleep(0.00001)
    GPIO.output(TANK_TRIG, GPIO.LOW)

    deadline = time.perf_counter() + 0.04
    while GPIO.input(TANK_ECHO) == GPIO.LOW:
        if time.perf_counter() > deadline:
            return None
    pulse_start = time.perf_counter()
    deadline = pulse_start + 0.04
    while GPIO.input(TANK_ECHO) == GPIO.HIGH:
        if time.perf_counter() > deadline:
            return None
    pulse_end = time.perf_counter()
    return round((pulse_end - pulse_start) * 17150, 2)

def tank_worker():
    lcd_write(0, "Smart Greenhouse")
    lcd_write(1, "Starting...")
    stop_event.wait(2)
    while not stop_event.is_set():
        try:
            with state_lock:
                mode = state["tank"].get("mode", "AUTO")

            distance = get_distance()
            if distance is None:
                update_section("tank", sensor_ok=False)
            else:
                update_section("tank", distance_cm=distance, sensor_ok=True)
                lcd_write(0, f"Dist:{distance:5.1f}cm")

                if mode == "AUTO":
                    motor_on = distance >= TANK_FULL_CM
                    set_physical_relay(TANK_RELAY, motor_on)
                    update_section("tank", motor="ON" if motor_on else "OFF")
                    with state_lock: state["relays"]["TANK_MOTOR"] = "ON" if motor_on else "OFF"
                    lcd_write(1, f"Motor:{'ON' if motor_on else 'OFF'}")
        except Exception as e:
            print(f"[TANK] error: {e}")
        stop_event.wait(TANK_INTERVAL)

def soil_worker():
    while not stop_event.is_set():
        wait_time = SOIL_INTERVAL
        try:
            with state_lock:
                mode = state["soil"].get("mode", "AUTO")

            if soil_channel:
                raw = soil_channel.value
                volt = soil_channel.voltage
                dry = raw > DRY_THRESHOLD
                update_section("soil", raw=raw, voltage=round(volt, 3),
                               soil="DRY" if dry else "WET/NORMAL", sensor_ok=True)

                if mode == "AUTO" and dry:
                    print("[SOIL] Moisture depleted (DRY) -> Starting 5s Drip Irrigation Cycle")
                    set_physical_relay(PUMP_RELAY, True)
                    update_section("soil", pump="ON")
                    with state_lock: state["relays"]["SOIL_PUMP"] = "ON"
                    stop_event.wait(PUMP_TIME)
                    set_physical_relay(PUMP_RELAY, False)
                    update_section("soil", pump="OFF")
                    with state_lock: state["relays"]["SOIL_PUMP"] = "OFF"
                    print("[SOIL] Irrigation completed. Soak cooldown active.")
                    wait_time = SOAK_TIME
        except Exception as e:
            print(f"[SOIL] error: {e}")
        stop_event.wait(wait_time)

def climate_worker():
    while not stop_event.is_set():
        try:
            with state_lock:
                mode = state["climate"].get("mode", "AUTO")

            if dht:
                temperature = dht.temperature
                humidity = dht.humidity
                if temperature is not None and humidity is not None:
                    update_section("climate", temperature=round(temperature, 1),
                                   humidity=round(humidity, 1), sensor_ok=True)

                    if mode == "AUTO":
                        if temperature >= FAN_ON_TEMP:
                            set_physical_relay(FAN_RELAY, True)
                            update_section("climate", fan="ON")
                            with state_lock: state["relays"]["FAN"] = "ON"
                        elif temperature <= FAN_OFF_TEMP:
                            set_physical_relay(FAN_RELAY, False)
                            update_section("climate", fan="OFF")
                            with state_lock: state["relays"]["FAN"] = "OFF"
            stop_event.wait(CLIMATE_INTERVAL)
        except RuntimeError:
            stop_event.wait(CLIMATE_INTERVAL)
        except Exception as e:
            print(f"[CLIMATE] error: {e}")
            stop_event.wait(CLIMATE_INTERVAL)

# ==============================================================================
# CLOUD GATEWAY SYNC & REMOTE COMMAND EXECUTION
# ==============================================================================
def apply_remote_command(device_type, command_data):
    """Executes actuator commands received from the cloud dashboard and confirms physical GPIO."""
    req_state = command_data.get("state")
    req_mode = command_data.get("mode", "MANUAL")
    print(f"\n[COMMAND] Received Remote Actuation for {device_type} -> State: {req_state}, Mode: {req_mode}")

    target_pin = None
    section_name = None
    state_key = None

    if device_type == "GROW_LIGHT":
        target_pin = LIGHT_RELAY
        section_name = "light"
        state_key = "light_status"
    elif device_type == "TANK_MOTOR":
        target_pin = TANK_RELAY
        section_name = "tank"
        state_key = "motor"
    elif device_type == "SOIL_PUMP":
        target_pin = PUMP_RELAY
        section_name = "soil"
        state_key = "pump"
    elif device_type == "FAN":
        target_pin = FAN_RELAY
        section_name = "climate"
        state_key = "fan"

    if section_name:
        with state_lock:
            state[section_name]["mode"] = req_mode

        if req_state:
            is_on = (req_state.upper() == "ON")
            if target_pin:
                set_physical_relay(target_pin, is_on)
            with state_lock:
                state[section_name][state_key] = "ON" if is_on else "OFF"
                state["relays"][device_type] = "ON" if is_on else "OFF"
            print(f"[COMMAND] ✓ Physical GPIO BCM {target_pin} set for {device_type} -> {'ON' if is_on else 'OFF'}")

def cloud_sync_worker():
    """Outbound HTTPS/HTTP Telemetry stream and remote command listener."""
    print(f"[CLOUD] Outbound Sync to Cloud Gateway: {GATEWAY_URL} (Interval: {SYNC_INTERVAL}s)")
    session = requests.Session()

    while not stop_event.is_set():
        try:
            with state_lock:
                telemetry_payload = {
                    "source": "RaspberryPi_College_Node",
                    "timestamp": datetime.now().isoformat(),
                    "lux": state["light"].get("lux"),
                    "light": copy.deepcopy(state["light"]),
                    "tank": copy.deepcopy(state["tank"]),
                    "soil": copy.deepcopy(state["soil"]),
                    "climate": copy.deepcopy(state["climate"]),
                    "relays": copy.deepcopy(state["relays"]),
                }

            res = session.post(GATEWAY_URL, json=telemetry_payload, timeout=4)
            if res.status_code in (200, 201):
                data = res.json()
                with state_lock:
                    state["gateway"]["connected"] = True
                    state["gateway"]["last_sync"] = datetime.now().isoformat()

                pending_commands = data.get("pendingCommands", {})
                if pending_commands:
                    for dev_type, cmd in pending_commands.items():
                        apply_remote_command(dev_type, cmd)
            else:
                with state_lock:
                    state["gateway"]["connected"] = False

        except requests.exceptions.RequestException:
            with state_lock:
                state["gateway"]["connected"] = False

        stop_event.wait(SYNC_INTERVAL)

# ==============================================================================
# LIFECYCLE
# ==============================================================================
def _on_sigterm(signum, frame):
    raise KeyboardInterrupt

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, _on_sigterm)

    # Print active hardware mapping at startup
    print_gpio_summary()

    workers = [
        ("tank", tank_worker),
        ("cloud_sync", cloud_sync_worker)
    ]
    if bh1750 or not ON_RASPBERRY_PI:
        workers.append(("light", light_worker))
    if soil_channel or not ON_RASPBERRY_PI:
        workers.append(("soil", soil_worker))
    if dht or not ON_RASPBERRY_PI:
        workers.append(("climate", climate_worker))

    threads = [threading.Thread(target=fn, name=name, daemon=True) for name, fn in workers]

    print("==================================================")
    print(" 🌿 SMART GREENHOUSE AUTOMATION — PI EDGE CONTROLLER")
    print("==================================================")
    print(f"Cloud Target: {GATEWAY_URL}")
    print("Press Ctrl+C to stop.\n")

    for t in threads:
        t.start()

    try:
        while not stop_event.is_set():
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping Raspberry Pi controller...")
    finally:
        stop_event.set()
        for t in threads:
            t.join(timeout=2)
        all_relays_off()
        if lcd:
            try: lcd.clear()
            except Exception: pass
        if dht:
            try: dht.exit()
            except Exception: pass
        if ON_RASPBERRY_PI:
            GPIO.cleanup()
            print("GPIO cleaned up safely.")
