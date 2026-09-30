const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { state, isHardwareOnline, updateTelemetry } = require('../services/greenhouseState');

// @desc    Get latest environment sensor telemetry
// @route   GET /api/sensors/latest
router.get('/latest', (req, res) => {
  const t = state.telemetry;
  const isOnline = isHardwareOnline();

  res.status(200).json({
    success: true,
    connected: isOnline,
    lastSync: state.gateway.lastSync,
    timestamp: t.timestamp || new Date().toISOString(),
    data: {
      temperature: isOnline ? t.temperature : null,
      humidity: isOnline ? t.humidity : null,
      lux: isOnline ? t.lux : null,
      tankDistanceCm: isOnline ? t.tankDistanceCm : null,
      tankPercent: isOnline ? t.tankPercent : null,
      soilRaw: isOnline ? t.soilRaw : null,
      soilVoltage: isOnline ? t.soilVoltage : null,
      soilStatus: isOnline ? t.soilStatus : 'UNKNOWN',
      naturalLight: isOnline ? t.naturalLight : 'Unknown',
      sensorOk: isOnline ? t.sensorOk : {
        dht22: false,
        bh1750: false,
        ads1115: false,
        ultrasonic: false,
        lcd: false,
      },
    },
  });
});

// @desc    Get sensor history for analytics charts with time range filter
// @route   GET /api/sensors/history?range=1H|6H|12H|24H|7D
router.get('/history', async (req, res) => {
  const range = (req.query.range || '1H').toUpperCase();

  // If MongoDB is connected, query SensorReading
  if (mongoose.connection.readyState === 1) {
    try {
      const SensorReading = require('../models/SensorReading');
      const now = new Date();
      let startTime = new Date(now.getTime() - 60 * 60 * 1000); // Default 1H

      if (range === '6H') {
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      } else if (range === '12H') {
        startTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      } else if (range === '24H') {
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (range === '7D') {
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const readings = await SensorReading.find({
        timestamp: { $gte: startTime },
      })
        .sort({ timestamp: 1 })
        .limit(200)
        .lean();

      if (readings && readings.length > 0) {
        const formatted = readings.map((r) => ({
          timestamp: r.timestamp,
          timeLabel: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temperature: r.temperature,
          humidity: r.humidity,
          lux: r.lightLux,
          tankPercent: r.tankLevelPercent,
          tankDistanceCm: r.tankDistanceCm,
          soilRaw: r.soilAdc,
          soilVoltage: r.soilVoltage,
        }));

        return res.status(200).json({
          success: true,
          range,
          source: 'database',
          count: formatted.length,
          data: formatted,
        });
      }
    } catch (err) {
      console.warn('DB history query fallback to memory:', err.message);
    }
  }

  // Fallback to in-memory history slice
  let filtered = [...state.history];
  if (range === '1H') {
    filtered = filtered.slice(-30);
  } else if (range === '6H') {
    filtered = filtered.slice(-60);
  } else {
    filtered = filtered.slice(-100);
  }

  res.status(200).json({
    success: true,
    range,
    source: 'in-memory',
    count: filtered.length,
    data: filtered,
  });
});

// @desc    Gateway endpoint for remote Raspberry Pi telemetry pusher over internet/cloud
// @route   POST /api/sensors/gateway
router.post('/gateway', (req, res) => {
  try {
    const payload = req.body || {};
    updateTelemetry(payload);

    res.status(200).json({
      success: true,
      message: 'Telemetry synchronized successfully with cloud',
      pendingCommands: state.pendingCommands,
      deviceStates: state.devices,
    });
  } catch (error) {
    console.error('Error handling gateway telemetry:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// @desc    Gateway GET endpoint alias
// @route   GET /api/sensors/gateway
router.get('/gateway', (req, res) => {
  res.status(200).json({
    success: true,
    connected: isHardwareOnline(),
    lastSync: state.gateway.lastSync,
    telemetry: state.telemetry,
    devices: state.devices,
    pendingCommands: state.pendingCommands,
  });
});

module.exports = router;
