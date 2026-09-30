# 🌿 Smart Greenhouse Automation System (IOTrex)

> **Production-Ready Single-Page IoT Control Center & Dual AI Integration**
> Integrated with Raspberry Pi BCM GPIO hardware automation, Ultralytics YOLO11s pest detection, and PyTorch ResNet-18 crop disease diagnosis.

---

## ⚡ Quick Start

### Start Full Stack (Backend API + Frontend Dashboard)
```bash
npm run dev
```
- **Dashboard UI**: [http://localhost:5173](http://localhost:5173) (Clean White Theme IoT Dashboard)
- **Express Backend API**: [http://localhost:5000](http://localhost:5000)
- **Live AI Service**: [http://localhost:8001](http://localhost:8001)

---

## 🏗 System Architecture & Sections

```text
IOTrex Dashboard (Single-Page Control Center)
├── 🏠 1. Dashboard Overview       # Live 5 Sensor Cards (Temp, Hum, Lux, Tank %, Soil ADC)
├── 🎛 2. Controls                 # 4 Actuators (Grow Light, Tank Motor, Soil Pump, Fan) [ON] [OFF] [AUTO]
├── 📊 3. Analytics                # 4 Real-time Chart.js telemetry graphs with threshold lines
├── 🌱 4. Crop Monitoring AI       # Live camera / upload -> PyTorch ResNet-18 disease diagnosis
├── 🐛 5. Pest Monitoring AI       # Live camera / upload -> YOLO11s object detection with bounding boxes
├── 📋 6. Automation Activity      # Live audit event log (Sensor, Automation, Manual, Error)
└── ⚙ 7. System Diagnostics       # Hardware GPIO mapping, I²C bus device tables, safety notices
```

---

## 🔌 Hardware GPIO & I²C Mapping

The system strictly follows **BCM GPIO Pinout** with **Active-Low Relay Logic** (`GPIO LOW = Relay ON`, `GPIO HIGH = Relay OFF`):

| Component | BCM GPIO | Physical Pin | Direction | Function / Threshold |
|---|---|---|---|---|
| **Grow Light Relay** | `GPIO17` | Pin 11 | OUTPUT | Active Low (`< 400 lux → ON`, `> 600 lux → OFF`) |
| **Tank Ultrasonic TRIG** | `GPIO16` | Pin 36 | OUTPUT | 10µs ultrasonic pulse trigger |
| **Tank Ultrasonic ECHO** | `GPIO18` | Pin 12 | INPUT | 5V pulse *(Requires level shifter / voltage divider)* |
| **Tank Motor Relay** | `GPIO13` | Pin 33 | OUTPUT | Active Low (`Distance >= 5 cm → ON (Refilling)`) |
| **Soil Pump Relay** | `GPIO22` | Pin 15 | OUTPUT | Active Low (`ADC > 8000 → Dry`, 5s run, 60s cooldown) |
| **DHT22 Data** | `GPIO26` | Pin 37 | INPUT | Ambient Temperature & Relative Humidity |
| **Fan Relay** | `GPIO21` | Pin 40 | OUTPUT | Active Low (`≥ 30°C → ON`, `≤ 28°C → OFF`) |
| **I²C SDA** | `GPIO2` | Pin 3 | BIDIRECTIONAL | Shared Data Bus (`BH1750 0x23`, `ADS1115 0x48`, `LCD 0x27`) |
| **I²C SCL** | `GPIO3` | Pin 5 | OUTPUT | Shared Clock Bus |

---

## 🧠 Live AI Microservices

The dashboard integrates directly with the existing live Python FastAPI inference service on port `8001`:

1. **Crop Disease Classification (`plant_disease_model.pt` - ResNet-18)**:
   - Endpoint: `POST /api/crop-health/diagnose` &rarr; `http://localhost:8001/predict-disease`
   - Output: Crop name, health status, confidence score, specific disease diagnosis, nutrient deficiency status, and agronomic treatment recommendations.
2. **Pest Detection & Localization (`best (1).pt` - YOLO11s)**:
   - Endpoint: `POST /api/pests/detect` &rarr; `http://localhost:8001/predict`
   - Output: Pest status, confidence score, pest count, individual species breakdown table, and annotated image with exact localized bounding boxes.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check and uptime |
| `GET` | `/api/sensors/latest` | Latest environment sensor readings |
| `GET` | `/api/sensors/history` | Historical telemetry records for analytics charts |
| `POST` | `/api/sensors/gateway` | Ingestion endpoint for Raspberry Pi gateway (`rpi_greenhouse_gateway.py`) |
| `GET` | `/api/devices` | All 4 actuator states and modes |
| `PUT` | `/api/devices/:deviceType` | Update actuator state (`ON`/`OFF`) and mode (`AUTO`/`MANUAL`) |
| `POST` | `/api/crop-health/diagnose` | Run ResNet-18 crop disease diagnosis on uploaded image |
| `GET` | `/api/crop-health/latest` | Fetch latest crop disease diagnosis |
| `POST` | `/api/pests/detect` | Run YOLO11s pest detection on uploaded image |
| `GET` | `/api/pests/latest` | Fetch latest pest detection with bounding boxes |
| `GET` | `/api/system/status` | Hardware GPIO mapping, sensor health, and system diagnostics |
| `GET` | `/api/system/activity` | Live audit trail of automation and manual events |
