"""
plant_measurement.py
====================
Reusable OpenCV-based plant canopy measurement module.
Measures Top-View Canopy Length, Canopy Width, and Canopy Area in pixels and centimeters.

Designed to run independently of the CNN classification model.
Compatible with standard Python and Raspberry Pi.
"""

import os
import cv2
import numpy as np


# ==============================================================================
# CONFIGURATION CONSTANTS (Easily adjustable for different environments)
# ==============================================================================

# HSV color range for green plant segmentation
# H (Hue): 25 to 90 covers yellowish-green to deep green
# S (Saturation): 40 to 255 eliminates grayish/white backgrounds
# V (Value/Brightness): 40 to 255 eliminates deep dark shadows/black background
LOWER_GREEN = np.array([25, 40, 40], dtype=np.uint8)
UPPER_GREEN = np.array([90, 255, 255], dtype=np.uint8)

# Minimum contour area (in pixels) to ignore tiny background specks/noise
MIN_CONTOUR_AREA = 500

# Morphological kernel sizes for noise removal and leaf connection
KERNEL_OPEN_SIZE = (5, 5)     # Removes small white noise dots
KERNEL_CLOSE_SIZE = (15, 15)  # Fills small gaps inside leaves & connects adjacent foliage

# ArUco Marker Calibration Settings (Stage 6)
# Standard 4x4 ArUco dictionary (50 unique IDs)
ARUCO_DICT_TYPE = cv2.aruco.DICT_4X4_50
# Known physical width/length of the square ArUco marker in centimeters
DEFAULT_ARUCO_SIZE_CM = 5.0


# ==============================================================================
# HELPER: ARUCO MARKER CALIBRATION
# ==============================================================================

def detect_aruco_marker(image, marker_size_cm=DEFAULT_ARUCO_SIZE_CM):
    """
    Detects an ArUco calibration marker in the image and calculates pixels-per-centimeter.

    Parameters:
    -----------
    image : numpy.ndarray
        BGR image captured from the top-view camera.
    marker_size_cm : float
        Physical width/height of the printed square ArUco marker in cm (default: 5.0 cm).

    Returns:
    --------
    dict
        {
            "detected": bool,
            "marker_id": int or None,
            "pixel_size": float or None,
            "pixels_per_cm": float or None,
            "corners": numpy.ndarray or None
        }
    """
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        aruco_dict = cv2.aruco.getPredefinedDictionary(ARUCO_DICT_TYPE)

        # Support both modern OpenCV 4.7+/5.0 (ArucoDetector) and legacy OpenCV 4.x
        if hasattr(cv2.aruco, "ArucoDetector"):
            parameters = cv2.aruco.DetectorParameters()
            detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)
            corners, ids, _ = detector.detectMarkers(gray)
        else:
            parameters = cv2.aruco.DetectorParameters_create()
            corners, ids, _ = cv2.aruco.detectMarkers(gray, aruco_dict, parameters=parameters)

        if ids is not None and len(corners) > 0:
            # Take the first detected marker
            marker_corners = corners[0][0]  # 4 corner points [[x, y], ...]
            marker_id = int(np.ravel(ids)[0])

            # Calculate pixel length of the 4 edges of the square marker
            side_top = np.linalg.norm(marker_corners[0] - marker_corners[1])
            side_right = np.linalg.norm(marker_corners[1] - marker_corners[2])
            side_bottom = np.linalg.norm(marker_corners[2] - marker_corners[3])
            side_left = np.linalg.norm(marker_corners[3] - marker_corners[0])

            # Average edge length in pixels
            pixel_size = float((side_top + side_right + side_bottom + side_left) / 4.0)
            pixels_per_cm = float(pixel_size / marker_size_cm)

            return {
                "detected": True,
                "marker_id": marker_id,
                "pixel_size": round(pixel_size, 2),
                "pixels_per_cm": round(pixels_per_cm, 3),
                "corners": corners
            }
    except Exception as e:
        # Graceful fallback if ArUco detection encounters unexpected error
        return {
            "detected": False,
            "error": str(e),
            "pixel_size": None,
            "pixels_per_cm": None,
            "corners": None
        }

    return {
        "detected": False,
        "marker_id": None,
        "pixel_size": None,
        "pixels_per_cm": None,
        "corners": None
    }


# ==============================================================================
# CORE MEASUREMENT FUNCTION
# ==============================================================================

def measure_plant(image_input, debug_dir="debug", save_debug_images=True, marker_size_cm=DEFAULT_ARUCO_SIZE_CM):
    """
    Measures top-view canopy dimensions of a plant from an image.
    Automatically detects ArUco marker for real-world centimeter calibration.
    If no marker is found, returns measurements in pixels with calibration marked unavailable.

    Parameters:
    -----------
    image_input : str or numpy.ndarray
        Either the file path to an image (e.g. 'plant.jpg') or a pre-loaded BGR image.
    debug_dir : str
        Directory where visual debug images (mask, bounding box) will be saved.
    save_debug_images : bool
        Whether to save debug images (original.jpg, mask.jpg, detected_plant.jpg).
    marker_size_cm : float
        Physical width of the ArUco marker in cm (default: 5.0 cm).

    Returns:
    --------
    dict
        Structured measurement results containing:
        - detected (bool): True if plant found, False otherwise
        - width_pixels (int): Canopy width in pixels
        - length_pixels (int): Canopy length in pixels
        - area_pixels (int): Canopy area in pixels
        - width_cm (float or None): Calibrated width (e.g. 18.2 cm) or None if uncalibrated
        - length_cm (float or None): Calibrated length (e.g. 24.9 cm) or None if uncalibrated
        - area_cm2 (float or None): Calibrated canopy area in cm² or None if uncalibrated
        - calibration_available (bool): True if ArUco detected, False otherwise
        - pixels_per_cm (float or None): Pixels per cm conversion ratio
        - error (str, optional): Error message if detection failed
    """
    # --------------------------------------------------------------------------
    # 1. Load and Validate Image
    # --------------------------------------------------------------------------
    if isinstance(image_input, str):
        if not os.path.exists(image_input):
            return {
                "detected": False,
                "error": f"Image file not found: {image_input}"
            }
        image = cv2.imread(image_input)
        if image is None:
            return {
                "detected": False,
                "error": f"Failed to decode image: {image_input}. File may be corrupted or not an image."
            }
    elif isinstance(image_input, np.ndarray):
        image = image_input.copy()
    else:
        return {
            "detected": False,
            "error": f"Invalid input type: {type(image_input)}. Expected file path or numpy array."
        }

    # --------------------------------------------------------------------------
    # 2. Check for ArUco Calibration Marker (Stage 6)
    # --------------------------------------------------------------------------
    aruco_result = detect_aruco_marker(image, marker_size_cm=marker_size_cm)
    calibration_available = aruco_result["detected"]
    pixels_per_cm = aruco_result.get("pixels_per_cm")

    # --------------------------------------------------------------------------
    # 3. Convert Color Space: BGR to HSV
    # --------------------------------------------------------------------------
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # --------------------------------------------------------------------------
    # 4. Create Green Mask & Apply Morphological Filtering
    # --------------------------------------------------------------------------
    raw_mask = cv2.inRange(hsv, LOWER_GREEN, UPPER_GREEN)

    # Opening removes small noise specks
    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, KERNEL_OPEN_SIZE)
    clean_mask = cv2.morphologyEx(raw_mask, cv2.MORPH_OPEN, kernel_open)

    # Closing joins separated leaflets and fills internal holes
    kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, KERNEL_CLOSE_SIZE)
    clean_mask = cv2.morphologyEx(clean_mask, cv2.MORPH_CLOSE, kernel_close)

    # --------------------------------------------------------------------------
    # 5. Find Contours and Filter Out Noise
    # --------------------------------------------------------------------------
    contours, _ = cv2.findContours(
        clean_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        return {
            "detected": False,
            "error": "No green plant contours detected in the image."
        }

    valid_contours = [cnt for cnt in contours if cv2.contourArea(cnt) >= MIN_CONTOUR_AREA]

    if not valid_contours:
        return {
            "detected": False,
            "error": f"Plant region too small (all contours are below {MIN_CONTOUR_AREA} pixels)."
        }

    # --------------------------------------------------------------------------
    # 6. Combine Plant Contours (Handles Disconnected Leaves)
    # --------------------------------------------------------------------------
    combined_points = np.vstack(valid_contours)
    x, y, width_px, length_px = cv2.boundingRect(combined_points)
    area_px = int(sum(cv2.contourArea(cnt) for cnt in valid_contours))

    # --------------------------------------------------------------------------
    # 7. Calculate Centimeter Dimensions (If Calibrated)
    # --------------------------------------------------------------------------
    width_cm = None
    length_cm = None
    area_cm2 = None

    if calibration_available and pixels_per_cm and pixels_per_cm > 0:
        width_cm = round(width_px / pixels_per_cm, 1)
        length_cm = round(length_px / pixels_per_cm, 1)
        area_cm2 = round(area_px / (pixels_per_cm ** 2), 1)

    # --------------------------------------------------------------------------
    # 8. Visual Debugging Output Generation
    # --------------------------------------------------------------------------
    if save_debug_images and debug_dir:
        os.makedirs(debug_dir, exist_ok=True)

        debug_original = image.copy()

        # If ArUco marker found, draw detection outline on debug image
        if calibration_available and aruco_result.get("corners"):
            try:
                cv2.aruco.drawDetectedMarkers(debug_original, aruco_result["corners"])
            except Exception:
                pass

        # Draw green bounding box around canopy
        cv2.rectangle(
            debug_original,
            (x, y),
            (x + width_px, y + length_px),
            (0, 255, 0),
            3
        )

        # Draw leaf contour outlines in cyan
        cv2.drawContours(debug_original, valid_contours, -1, (255, 255, 0), 2)

        # Build text labels
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.75
        thickness = 2

        if calibration_available:
            label_w = f"Canopy Width : {width_cm} cm ({width_px} px)"
            label_l = f"Canopy Length: {length_cm} cm ({length_px} px)"
            label_a = f"Canopy Area  : {area_cm2} cm2"
            label_c = f"ArUco Calib  : {pixels_per_cm:.1f} px/cm"
            labels = [label_w, label_l, label_a, label_c]
        else:
            label_w = f"Canopy Width : {width_px} px"
            label_l = f"Canopy Length: {length_px} px"
            label_a = f"Canopy Area  : {area_px} px"
            label_c = "Calibration  : Not available (pixels only)"
            labels = [label_w, label_l, label_a, label_c]

        text_y_start = max(35, y - 10) if y > 120 else y + length_px + 30
        for idx, text in enumerate(labels):
            y_pos = text_y_start + (idx * 28)
            cv2.putText(debug_original, text, (max(10, x), y_pos), font, font_scale, (0, 0, 0), thickness + 2, cv2.LINE_AA)
            color = (0, 255, 255) if idx < 3 else ((0, 255, 0) if calibration_available else (0, 165, 255))
            cv2.putText(debug_original, text, (max(10, x), y_pos), font, font_scale, color, thickness, cv2.LINE_AA)

        # Binary Mask
        debug_mask = clean_mask

        # Isolated plant
        detected_plant = cv2.bitwise_and(image, image, mask=clean_mask)
        cv2.rectangle(detected_plant, (x, y), (x + width_px, y + length_px), (0, 255, 0), 2)

        # Save images
        cv2.imwrite(os.path.join(debug_dir, "original.jpg"), debug_original)
        cv2.imwrite(os.path.join(debug_dir, "mask.jpg"), debug_mask)
        cv2.imwrite(os.path.join(debug_dir, "detected_plant.jpg"), detected_plant)

    # --------------------------------------------------------------------------
    # 9. Return Structured Measurement Dictionary
    # --------------------------------------------------------------------------
    return {
        "detected": True,
        "width_pixels": int(width_px),
        "length_pixels": int(length_px),
        "area_pixels": int(area_px),
        "width_cm": width_cm,
        "length_cm": length_cm,
        "area_cm2": area_cm2,
        "calibration_available": bool(calibration_available),
        "pixels_per_cm": pixels_per_cm,
        "marker_id": aruco_result.get("marker_id"),
        "leaf_contour_count": len(valid_contours),
        "bounding_box": {
            "x": int(x),
            "y": int(y),
            "width": int(width_px),
            "length": int(length_px)
        }
    }
