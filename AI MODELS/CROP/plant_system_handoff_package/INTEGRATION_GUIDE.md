# Plant Monitoring System — Integration Guide

This package contains everything needed to integrate **Top-View Plant Canopy Measurement (OpenCV)** alongside the **Existing Plant Disease Classification (PyTorch CNN)** into the Raspberry Pi Flask dashboard.

---

## 1. Important Architecture Note

- **PyTorch Model (`plant_disease_model.pt`)**:
  - Unchanged and unretrained. It classifies the 38 plant and disease classes and provides AI confidence.
  - Neural networks cannot perform real-time pixel contour and ArUco geometry measurement; this is handled cleanly by OpenCV.
- **OpenCV Module (`plant_measurement.py`)**:
  - Runs in parallel on the **same captured image** (`plant.jpg`).
  - Measures **Canopy Width**, **Canopy Length**, and **Canopy Area**.
  - Automatically detects the included 5 cm ArUco marker to calibrate into **centimeters**. If no marker is present, it returns dimensions in **pixels** without crashing.

---

## 2. Package Contents

1. `plant_disease_model.pt`: The intact ResNet18 trained PyTorch CNN weights (44.8 MB).
2. `plant_measurement.py`: The reusable Python module containing `measure_plant()`.
3. `aruco_marker_5cm.png`: Printable 5 cm ArUco calibration marker (DICT_4X4_50, ID 0).
4. `INTEGRATION_GUIDE.md`: This guide.

---

## 3. How to Call in Flask / Camera Pipeline

In your Flask camera capture route (e.g. `POST /capture_and_analyze` or `app.py`):

```python
import cv2
from plant_measurement import measure_plant

# 1. Capture or load plant.jpg
IMAGE_PATH = "plant.jpg"

# 2. Existing CNN Disease Analysis (DO NOT MODIFY YOUR CNN LOGIC)
cnn_result = analyze_plant_disease(IMAGE_PATH)
# Example cnn_result:
# {
#     "plant": "Tomato",
#     "disease": "Early Blight",
#     "confidence": 94.2,
#     "status": "Diseased"
# }

# 3. New OpenCV Canopy Measurement
measurement = measure_plant(IMAGE_PATH, marker_size_cm=5.0)
# Example measurement result:
# {
#     "detected": True,
#     "width_pixels": 872,
#     "length_pixels": 871,
#     "area_pixels": 461723,
#     "width_cm": 29.3,           # None if uncalibrated
#     "length_cm": 29.2,          # None if uncalibrated
#     "area_cm2": 520.1,          # None if uncalibrated
#     "calibration_available": True,
#     "pixels_per_cm": 29.8
# }

# 4. Merge results for Flask Dashboard rendering
dashboard_data = {
    **cnn_result,
    "canopy_width": f"{measurement['width_cm']} cm" if measurement['calibration_available'] else f"{measurement['width_pixels']} px",
    "canopy_length": f"{measurement['length_cm']} cm" if measurement['calibration_available'] else f"{measurement['length_pixels']} px",
    "canopy_area": f"{measurement['area_cm2']} cm²" if measurement['calibration_available'] else f"{measurement['area_pixels']} px",
    "calibration_status": "Calibrated (ArUco 5cm)" if measurement['calibration_available'] else "Uncalibrated (Pixels only)"
}

return render_template("dashboard.html", data=dashboard_data)
```

---

## 4. Flask Dashboard UI Update

Replace any placeholder **Height** and **Weight** cards in `templates/dashboard.html` with:

- **Canopy Length**: `{{ data.canopy_length }}`
- **Canopy Width**: `{{ data.canopy_width }}`
- **Canopy Area**: `{{ data.canopy_area }}`
- **Calibration**: `{{ data.calibration_status }}`

---

## 5. Dependencies on Raspberry Pi

Standard packages already present in standard Raspberry Pi setups:
```bash
pip install opencv-python numpy
```
*(No extra heavy ML frameworks or Docker containers needed).*
