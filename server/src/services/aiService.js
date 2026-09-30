const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:8001';

// Check AI server health
async function checkAiHealth() {
  try {
    const res = await axios.get(`${AI_SERVER_URL}/health`, { timeout: 4000 });
    return {
      connected: true,
      url: AI_SERVER_URL,
      ...res.data,
    };
  } catch (err) {
    return {
      connected: false,
      url: AI_SERVER_URL,
      status: 'OFFLINE',
      error: err.message,
    };
  }
}

// Predict Crop Disease using existing live ResNet-18 model
async function diagnoseCropDisease(filePath, originalname = 'leaf.jpg') {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), {
    filename: originalname,
    contentType: 'image/jpeg',
  });

  const response = await axios.post(`${AI_SERVER_URL}/predict-disease`, form, {
    headers: {
      ...form.getHeaders(),
    },
    timeout: 30000,
  });

  return response.data;
}

// Predict Pests using existing live YOLO11s model
async function detectPests(filePath, conf = 0.35, originalname = 'pest.jpg') {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), {
    filename: originalname,
    contentType: 'image/jpeg',
  });

  const response = await axios.post(`${AI_SERVER_URL}/predict?conf=${conf}`, form, {
    headers: {
      ...form.getHeaders(),
    },
    timeout: 30000,
  });

  return response.data;
}

module.exports = {
  checkAiHealth,
  diagnoseCropDisease,
  detectPests,
};
