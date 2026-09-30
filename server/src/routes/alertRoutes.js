const express = require('express');
const router = express.Router();
const { state, resolveAlert } = require('../services/greenhouseState');

// @desc    Get all alerts
// @route   GET /api/alerts
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    count: state.alerts.length,
    data: state.alerts,
  });
});

// @desc    Get active unresolved alerts
// @route   GET /api/alerts/active
router.get('/active', (req, res) => {
  const active = state.alerts.filter((a) => !a.resolved);
  res.status(200).json({
    success: true,
    count: active.length,
    data: active,
  });
});

// @desc    Resolve alert
// @route   POST /api/alerts/:id/resolve
router.post('/:id/resolve', (req, res) => {
  const { id } = req.params;
  const alert = resolveAlert(id);
  if (!alert) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }

  res.status(200).json({
    success: true,
    message: 'Alert marked as resolved',
    data: alert,
  });
});

module.exports = router;
