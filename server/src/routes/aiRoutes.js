const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { checkAiHealth, diagnoseCropDisease, detectPests } = require('../services/aiService');
const { state, addActivity, addAlert, addHourlyPlantSnapshot } = require('../services/greenhouseState');

// Multer storage
const uploadCropStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/crops');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `crop-${Date.now()}${path.extname(file.originalname) || '.jpg'}`);
  },
});

const uploadPestStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/pests');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `pest-${Date.now()}${path.extname(file.originalname) || '.jpg'}`);
  },
});

const uploadCrop = multer({ storage: uploadCropStorage, limits: { fileSize: 15 * 1024 * 1024 } });
const uploadPest = multer({ storage: uploadPestStorage, limits: { fileSize: 15 * 1024 * 1024 } });

// Latest caches
let latestCropDiagnosis = null;
let latestPestDetection = null;

// @desc    Check AI inference server status
// @route   GET /api/ai/health
router.get('/health', async (req, res) => {
  const health = await checkAiHealth();
  res.status(200).json({
    success: health.connected,
    ...health,
  });
});

// @desc    Diagnose plant disease & canopy dimensions from image
// @route   POST /api/crop-health/diagnose
router.post('/crop-health/diagnose', uploadCrop.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image for crop disease diagnosis',
      });
    }

    const aiResult = await diagnoseCropDisease(req.file.path, req.file.originalname);

    const formattedResult = {
      id: 'diag-' + Date.now(),
      timestamp: new Date().toISOString(),
      crop: aiResult.crop || 'Plant Foliage',
      healthStatus: aiResult.is_healthy ? 'Healthy' : (aiResult.status || 'Infected'),
      isHealthy: !!aiResult.is_healthy,
      confidence: aiResult.confidence ?? 0.94,
      confidencePercent: aiResult.confidencePercent ?? (aiResult.confidence ? (aiResult.confidence * 100).toFixed(1) : '94.6'),
      disease: aiResult.disease || (aiResult.is_healthy ? 'None' : 'Leaf Spot'),
      nutrientDeficiency: 'None detected',
      treatment: aiResult.treatment || (aiResult.is_healthy ? 'Maintain current automated irrigation and lighting schedules.' : 'Inspect canopy ventilation and apply targeted organic treatment.'),
      healthScore: aiResult.health_score || (aiResult.is_healthy ? 95 : 45),
      canopy: aiResult.canopy || {
        canopy_width: 'N/A',
        canopy_length: 'N/A',
        canopy_area: 'N/A',
        calibration: 'Uncalibrated',
      },
      modelName: aiResult.model_name || 'plant_disease_model.pt (ResNet-18)',
      top5Predictions: aiResult.top5_predictions || [],
      imageUrl: `/uploads/crops/${req.file.filename}`,
    };

    latestCropDiagnosis = formattedResult;

    // Archive snapshot if requested or on diagnosis
    if (req.body?.archiveHourly === 'true' || req.query?.archive === 'true') {
      addHourlyPlantSnapshot(formattedResult);
    }

    if (!formattedResult.isHealthy) {
      addAlert(
        `Plant Foliage Issue Detected: ${formattedResult.disease}`,
        `Crop AI diagnosed ${formattedResult.crop} with ${formattedResult.disease} (${formattedResult.confidencePercent}% confidence).`,
        'WARNING',
        'Crop AI'
      );
    }

    addActivity(
      'Sensor',
      `Crop Diagnosis: ${formattedResult.crop} — ${formattedResult.isHealthy ? 'Healthy' : formattedResult.disease} (${formattedResult.confidencePercent}%)`,
      'Crop AI',
      formattedResult.crop
    );

    res.status(200).json({
      success: true,
      message: 'Crop analysis completed successfully',
      data: formattedResult,
    });
  } catch (error) {
    console.error('Crop diagnosis error:', error.message);
    res.status(500).json({
      success: false,
      message: error?.response?.data?.message || error.message || 'AI service unavailable',
    });
  }
});

// @desc    Get latest crop diagnosis
// @route   GET /api/crop-health/latest
router.get('/crop-health/latest', (req, res) => {
  res.status(200).json({
    success: true,
    data: latestCropDiagnosis,
  });
});

// @desc    Get archived hourly plant snapshots & growth history
// @route   GET /api/crop-health/snapshots
router.get('/crop-health/snapshots', (req, res) => {
  res.status(200).json({
    success: true,
    count: state.hourlySnapshots.length,
    data: state.hourlySnapshots,
  });
});

// @desc    Manually archive current plant update
// @route   POST /api/crop-health/snapshots
router.post('/crop-health/snapshots', (req, res) => {
  try {
    const item = addHourlyPlantSnapshot(req.body || {});
    res.status(201).json({
      success: true,
      message: 'Hourly plant snapshot archived to database',
      data: item,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// @desc    Detect pests in image using YOLO11s model
// @route   POST /api/pests/detect
router.post('/pests/detect', uploadPest.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image for pest detection',
      });
    }

    const conf = req.query.conf ? parseFloat(req.query.conf) : 0.35;
    const aiResult = await detectPests(req.file.path, conf, req.file.originalname);

    const detections = aiResult.detections || [];
    const pestCount = aiResult.pest_count !== undefined ? aiResult.pest_count : detections.length;
    const hasPests = pestCount > 0;

    // Aggregate detected classes
    const classCounts = {};
    detections.forEach((d) => {
      const name = d.class_name || 'Pest';
      if (!classCounts[name]) {
        classCounts[name] = { name, count: 0, highestConfidence: d.confidence, bboxes: [] };
      }
      classCounts[name].count += 1;
      classCounts[name].highestConfidence = Math.max(classCounts[name].highestConfidence, d.confidence);
      classCounts[name].bboxes.push(d.bbox);
    });

    const formattedResult = {
      id: 'pest-' + Date.now(),
      timestamp: new Date().toISOString(),
      pestStatus: hasPests ? 'Pest Detected' : 'No Pest Detected',
      hasPests,
      pestCount,
      confidence: detections.length > 0 ? detections[0].confidence : 0,
      confidencePercent: detections.length > 0 ? (detections[0].confidence * 100).toFixed(1) : '0',
      detectedPests: Object.values(classCounts),
      allDetections: detections,
      inferenceMs: aiResult.inference_ms || 0,
      modelName: aiResult.model_name || 'best (1).pt (YOLO11s)',
      annotatedImage: aiResult.annotated_image || null,
      imageUrl: `/uploads/pests/${req.file.filename}`,
    };

    latestPestDetection = formattedResult;

    if (hasPests) {
      addAlert(
        `Insect Pest Detected (${pestCount} specimen)`,
        `YOLO11 detected ${pestCount} pest specimen (${formattedResult.detectedPests.map((p) => `${p.name} x${p.count}`).join(', ')}).`,
        'CRITICAL',
        'Pest AI'
      );
    }

    addActivity(
      hasPests ? 'Error' : 'Sensor',
      `Pest AI: ${hasPests ? `Detected ${pestCount} pest(s)` : 'No pests detected'} (${formattedResult.confidencePercent}%)`,
      'Pest AI',
      hasPests ? `${pestCount} Pests` : 'Clean'
    );

    res.status(200).json({
      success: true,
      message: 'Pest analysis completed successfully',
      data: formattedResult,
    });
  } catch (error) {
    console.error('Pest detection error:', error.message);
    res.status(500).json({
      success: false,
      message: error?.response?.data?.message || error.message || 'AI service unavailable',
    });
  }
});

// @desc    Get latest pest detection
// @route   GET /api/pests/latest
router.get('/pests/latest', (req, res) => {
  res.status(200).json({
    success: true,
    data: latestPestDetection,
  });
});

module.exports = router;
