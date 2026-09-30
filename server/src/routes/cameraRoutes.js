const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// Multer memory storage for ultra-fast frame ingestion
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max frame
});

// Camera state & buffer
let latestFrameBuffer = null;
let lastFrameTimestamp = null;
let frameCount = 0;
let fps = 0;
let lastFpsCalc = Date.now();

// Active MJPEG stream client response objects
const mjpegClients = new Set();

// Calculate FPS periodically
setInterval(() => {
  const now = Date.now();
  const elapsedSec = (now - lastFpsCalc) / 1000;
  if (elapsedSec > 0) {
    fps = Math.round((frameCount / elapsedSec) * 10) / 10;
  }
  frameCount = 0;
  lastFpsCalc = now;
}, 3000);

// Helper: Check if camera is actively streaming (last frame within 15 seconds)
function isCameraOnline() {
  if (!lastFrameTimestamp) return false;
  const elapsedMs = Date.now() - new Date(lastFrameTimestamp).getTime();
  return elapsedMs < 15000;
}

// @desc    Ingest raw frame from Raspberry Pi outbound camera streamer
// @route   POST /api/camera/frame
router.post('/frame', upload.single('frame'), (req, res) => {
  try {
    let buffer = null;
    if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
    } else if (req.body && Buffer.isBuffer(req.body)) {
      buffer = req.body;
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, message: 'No image frame provided' });
    }

    latestFrameBuffer = buffer;
    lastFrameTimestamp = new Date().toISOString();
    frameCount++;

    // Push frame to all connected MJPEG clients
    if (mjpegClients.size > 0) {
      const header = `--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${buffer.length}\r\n\r\n`;
      for (const clientRes of mjpegClients) {
        try {
          clientRes.write(header);
          clientRes.write(buffer);
          clientRes.write('\r\n');
        } catch {
          mjpegClients.delete(clientRes);
        }
      }
    }

    res.status(200).json({
      success: true,
      timestamp: lastFrameTimestamp,
      activeStreamers: mjpegClients.size,
    });
  } catch (error) {
    console.error('Error ingesting camera frame:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Live MJPEG stream for remote dashboard viewing over internet
// @route   GET /api/camera/stream
router.get('/stream', (req, res) => {
  if (!isCameraOnline() && !latestFrameBuffer) {
    // Return 503 if no stream has been received yet
    return res.status(503).json({
      success: false,
      message: 'Raspberry Pi camera stream offline. Awaiting camera connection.',
    });
  }

  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Connection': 'close',
    'Access-Control-Allow-Origin': '*',
  });

  mjpegClients.add(res);

  // Send current cached frame immediately so user sees instant preview
  if (latestFrameBuffer) {
    res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${latestFrameBuffer.length}\r\n\r\n`);
    res.write(latestFrameBuffer);
    res.write('\r\n');
  }

  req.on('close', () => {
    mjpegClients.delete(res);
  });
});

// @desc    Get latest single JPEG frame snapshot
// @route   GET /api/camera/frame
router.get('/frame', (req, res) => {
  if (!latestFrameBuffer) {
    return res.status(404).json({
      success: false,
      message: 'No camera frame captured yet',
    });
  }

  res.writeHead(200, {
    'Content-Type': 'image/jpeg',
    'Content-Length': latestFrameBuffer.length,
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(latestFrameBuffer);
});

// @desc    Get camera connectivity status & metadata
// @route   GET /api/camera/status
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    connected: isCameraOnline(),
    lastSync: lastFrameTimestamp,
    fps,
    activeViewers: mjpegClients.size,
    hasFrame: latestFrameBuffer !== null,
  });
});

// @desc    Capture live remote frame and feed directly to AI Engine (Crop or Pest)
// @route   POST /api/camera/capture-ai
router.post('/capture-ai', async (req, res) => {
  try {
    if (!latestFrameBuffer) {
      return res.status(400).json({
        success: false,
        message: 'No live camera frame available on Raspberry Pi. Ensure camera is streaming.',
      });
    }

    const { targetAi = 'crop', conf = 0.35 } = req.body || {};
    const aiServerUrl = process.env.AI_SERVER_URL || 'http://localhost:8001';

    const formData = new FormData();
    formData.append('file', latestFrameBuffer, {
      filename: `remote-capture-${Date.now()}.jpg`,
      contentType: 'image/jpeg',
    });

    let aiEndpoint = `${aiServerUrl}/predict-disease`;
    if (targetAi === 'pest') {
      aiEndpoint = `${aiServerUrl}/predict?conf=${conf}`;
    }

    const aiRes = await axios.post(aiEndpoint, formData, {
      headers: formData.getHeaders(),
      timeout: 25000,
    });

    res.status(200).json({
      success: true,
      targetAi,
      data: aiRes.data,
      snapshotTimestamp: lastFrameTimestamp,
    });
  } catch (error) {
    console.error('Error forwarding live frame to AI:', error.message);
    res.status(500).json({
      success: false,
      message: error?.response?.data?.message || error.message || 'AI Engine unavailable',
    });
  }
});

module.exports = {
  router,
  isCameraOnline,
  getLatestFrame: () => latestFrameBuffer,
};
