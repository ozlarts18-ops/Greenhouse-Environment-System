const express = require('express');
const router = express.Router();
const { state, stateEmitter, isHardwareOnline } = require('../services/greenhouseState');

// @desc    Real-time Server-Sent Events (SSE) telemetry & event stream
// @route   GET /api/realtime/stream
router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // 1. Send initial state snapshot immediately
  const initialPayload = {
    type: 'init',
    data: {
      connected: isHardwareOnline(),
      lastSync: state.gateway.lastSync,
      telemetry: state.telemetry,
      devices: state.devices,
      alerts: state.alerts,
      history: state.history.slice(-30),
      timestamp: new Date().toISOString(),
    },
  };
  res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

  // Event handlers
  const onTelemetry = (payload) => {
    res.write(`data: ${JSON.stringify({ type: 'telemetry', data: payload })}\n\n`);
  };

  const onDevices = (devices) => {
    res.write(`data: ${JSON.stringify({ type: 'devices', data: devices })}\n\n`);
  };

  const onAlert = (alert) => {
    res.write(`data: ${JSON.stringify({ type: 'alert', data: alert })}\n\n`);
  };

  const onAlertResolved = (alert) => {
    res.write(`data: ${JSON.stringify({ type: 'alert_resolved', data: alert })}\n\n`);
  };

  const onActivity = (activity) => {
    res.write(`data: ${JSON.stringify({ type: 'activity', data: activity })}\n\n`);
  };

  const onSnapshot = (snapshot) => {
    res.write(`data: ${JSON.stringify({ type: 'snapshot', data: snapshot })}\n\n`);
  };

  // Register listeners
  stateEmitter.on('telemetry', onTelemetry);
  stateEmitter.on('devices', onDevices);
  stateEmitter.on('alert', onAlert);
  stateEmitter.on('alert_resolved', onAlertResolved);
  stateEmitter.on('activity', onActivity);
  stateEmitter.on('snapshot', onSnapshot);

  // Heartbeat ping every 25 seconds
  const heartbeat = setInterval(() => {
    res.write(`: ping ${Date.now()}\n\n`);
  }, 25000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    stateEmitter.removeListener('telemetry', onTelemetry);
    stateEmitter.removeListener('devices', onDevices);
    stateEmitter.removeListener('alert', onAlert);
    stateEmitter.removeListener('alert_resolved', onAlertResolved);
    stateEmitter.removeListener('activity', onActivity);
    stateEmitter.removeListener('snapshot', onSnapshot);
  });
});

module.exports = router;
