#!/usr/bin/env python3
"""
================================================================================
Smart Greenhouse Automation System — Central GPIO Hardware Configuration
================================================================================
All Raspberry Pi BCM GPIO pin assignments are declared and validated here.
You can safely rewire any component to a different valid GPIO pin by changing
the values in this file or setting the corresponding environment variables.

DO NOT hardcode GPIO numbers in other files; always import from this module.
================================================================================
"""

import os
import sys

# ==============================================================================
# 1. 40-PIN HEADER PHYSICAL PIN TO BCM GPIO MAP (For Reference & Validation)
# ==============================================================================
# Valid user-accessible BCM GPIO numbers on the standard 40-pin header:
VALID_BCM_GPIOS = {
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27
}

BCM_TO_PHYSICAL_PIN = {
    2: "Pin 3 (SDA1)",
    3: "Pin 5 (SCL1)",
    4: "Pin 7 (GPIO4)",
    5: "Pin 29 (GPIO5)",
    6: "Pin 31 (GPIO6)",
    7: "Pin 26 (SPI_CE1)",
    8: "Pin 24 (SPI_CE0)",
    9: "Pin 21 (SPI_MISO)",
    10: "Pin 19 (SPI_MOSI)",
    11: "Pin 23 (SPI_SCLK)",
    12: "Pin 32 (PWM0)",
    13: "Pin 33 (PWM1)",
    14: "Pin 8 (TXD)",
    15: "Pin 10 (RXD)",
    16: "Pin 36 (GPIO16)",
    17: "Pin 11 (GPIO17)",
    18: "Pin 12 (PWM0)",
    19: "Pin 35 (PWM1)",
    20: "Pin 38 (PCM_DIN)",
    21: "Pin 40 (PCM_DOUT)",
    22: "Pin 15 (GPIO22)",
    23: "Pin 16 (GPIO23)",
    24: "Pin 18 (GPIO24)",
    25: "Pin 22 (GPIO25)",
    26: "Pin 37 (GPIO26)",
    27: "Pin 13 (GPIO27)",
}

# ==============================================================================
# 2. DEFAULT HARDWARE CONFIGURATION
# ==============================================================================
# Change these values or use environment variables to rewire physical pins:
GPIO_CONFIG = {
    # Grow Light Relay (Active LOW)
    "GROW_LIGHT_RELAY": int(os.environ.get("GROW_LIGHT_GPIO", 17)),

    # Water Tank Ultrasonic Sensor (HC-SR04)
    "TANK_TRIG": int(os.environ.get("TANK_TRIG_GPIO", 16)),
    "TANK_ECHO": int(os.environ.get("TANK_ECHO_GPIO", 18)),

    # Water Reservoir Refill Motor Relay (Active LOW)
    "TANK_MOTOR_RELAY": int(os.environ.get("TANK_MOTOR_GPIO", 13)),

    # Automated Drip Irrigation Pump Relay (Active LOW)
    "SOIL_PUMP_RELAY": int(os.environ.get("SOIL_PUMP_GPIO", 22)),

    # Canopy Climate DHT22 Temperature & Humidity Sensor
    "DHT22_DATA": int(os.environ.get("DHT22_GPIO", 26)),

    # Climate Ventilation Exhaust Fan Relay (Active LOW)
    "FAN_RELAY": int(os.environ.get("FAN_GPIO", 21)),

    # Primary I2C Bus Pins (BH1750 Lux, ADS1115 Soil ADC, 16x2 LCD)
    "I2C_SDA": int(os.environ.get("I2C_SDA_GPIO", 2)),
    "I2C_SCL": int(os.environ.get("I2C_SCL_GPIO", 3)),
}

# Relay electrical trigger mode
# True = Low-Level Trigger Relay (GPIO LOW = Energized/ON, GPIO HIGH = Open/OFF)
RELAY_ACTIVE_LOW = True

# Automation Hysteresis Thresholds
AUTOMATION_THRESHOLDS = {
    "LIGHT_ON_BELOW_LUX": 400.0,
    "LIGHT_OFF_ABOVE_LUX": 600.0,
    "TANK_FULL_STOP_CM": 5.0,
    "SOIL_DRY_THRESHOLD_ADC": 8000,
    "SOIL_WATERING_SECONDS": 5.0,
    "SOIL_SOAK_COOLDOWN_SECONDS": 60.0,
    "FAN_ON_TEMP_CELSIUS": 30.0,
    "FAN_OFF_TEMP_CELSIUS": 28.0,
}

# ==============================================================================
# 3. CONFIGURATION VALIDATION ENGINE
# ==============================================================================
def validate_gpio_config(config=None):
    """
    Validates that:
      1. Every assigned pin is a valid BCM GPIO (not power/ground/reserved).
      2. No two hardware devices share the same GPIO pin (conflict detection).
      3. I2C devices remain on valid I2C hardware bus pins.
    Raises ValueError on any invalid or conflicting configuration.
    """
    cfg = config or GPIO_CONFIG
    assigned_pins = {}

    for name, pin in cfg.items():
        # 1. Validate pin number is integer
        if not isinstance(pin, int):
            raise ValueError(f"[GPIO ERROR] Assignment for '{name}' must be an integer (got {pin}).")

        # 2. Validate pin exists on 40-pin Raspberry Pi header
        if pin not in VALID_BCM_GPIOS:
            raise ValueError(
                f"[GPIO ERROR] Pin BCM {pin} for '{name}' is NOT a valid Raspberry Pi GPIO! "
                f"Valid BCM GPIOs are: {sorted(list(VALID_BCM_GPIOS))}. "
                f"Ensure you are not selecting 5V (Pin 2/4), 3.3V (Pin 1/17), or GND pins."
            )

        # 3. Detect duplicate / conflicting pin assignments
        if pin in assigned_pins:
            conflict_device = assigned_pins[pin]
            raise ValueError(
                f"[GPIO CONFLICT ERROR] GPIO BCM {pin} ({BCM_TO_PHYSICAL_PIN.get(pin, 'Unknown Pin')}) "
                f"is assigned to multiple devices: '{conflict_device}' and '{name}'! "
                f"Every device must have a unique, dedicated GPIO pin."
            )

        assigned_pins[pin] = name

    # 4. Validate I2C hardware interface
    if cfg["I2C_SDA"] != 2 or cfg["I2C_SCL"] != 3:
        print(f"[GPIO WARN] Primary I2C bus default is SDA=BCM 2, SCL=BCM 3. Current: SDA={cfg['I2C_SDA']}, SCL={cfg['I2C_SCL']}")

    return True

def print_gpio_summary(config=None):
    """Prints a clean ASCII summary of all active GPIO mappings."""
    cfg = config or GPIO_CONFIG
    print("\n================================================================")
    print(" 🌿 RASPBERRY PI ACTIVE GPIO HARDWARE MAPPING CONFIGURATION")
    print("================================================================")
    print(f" {'Subsystem / Component':<30} | {'BCM Pin':<10} | {'Physical Header Pin'}")
    print("----------------------------------------------------------------")
    print(f" {'Grow Light Relay':<30} | BCM {cfg['GROW_LIGHT_RELAY']:<6} | {BCM_TO_PHYSICAL_PIN.get(cfg['GROW_LIGHT_RELAY'], 'Custom')}")
    print(f" {'Tank Ultrasonic TRIG':<30} | BCM {cfg['TANK_TRIG']:<6} | {BCM_TO_PHYSICAL_PIN.get(cfg['TANK_TRIG'], 'Custom')}")
    print(f" {'Tank Ultrasonic ECHO':<30} | BCM {cfg['TANK_ECHO']:<6} | {BCM_TO_PHYSICAL_PIN.get(cfg['TANK_ECHO'], 'Custom')}")
    print(f" {'Tank Motor Refill Relay':<30} | BCM {cfg['TANK_MOTOR_RELAY']:<6} | {BCM_TO_PHYSICAL_PIN.get(cfg['TANK_MOTOR_RELAY'], 'Custom')}")
    print(f" {'Soil Irrigation Pump Relay':<30} | BCM {cfg['SOIL_PUMP_RELAY']:<6} | {BCM_TO_PHYSICAL_PIN.get(cfg['SOIL_PUMP_RELAY'], 'Custom')}")
    print(f" {'DHT22 Climate Sensor':<30} | BCM {cfg['DHT22_DATA']:<6} | {BCM_TO_PHYSICAL_PIN.get(cfg['DHT22_DATA'], 'Custom')}")
    print(f" {'Ventilation Fan Relay':<30} | BCM {cfg['FAN_RELAY']:<6} | {BCM_TO_PHYSICAL_PIN.get(cfg['FAN_RELAY'], 'Custom')}")
    print(f" {'I2C SDA (BH1750, ADS1115, LCD)':<30} | BCM {cfg['I2C_SDA']:<6} | {BCM_TO_PHYSICAL_PIN.get(cfg['I2C_SDA'], 'Custom')}")
    print(f" {'I2C SCL (BH1750, ADS1115, LCD)':<30} | BCM {cfg['I2C_SCL']:<6} | {BCM_TO_PHYSICAL_PIN.get(cfg['I2C_SCL'], 'Custom')}")
    print("----------------------------------------------------------------")
    print(f" Relay Trigger Mode : {'ACTIVE LOW (0V = Energized/ON)' if RELAY_ACTIVE_LOW else 'ACTIVE HIGH (3.3V = Energized/ON)'}")
    print("================================================================\n")

# Run automatic validation on import
validate_gpio_config()

if __name__ == "__main__":
    print_gpio_summary()
