const express = require('express');
const router = express.Router();
const { state, setDevice } = require('../services/greenhouseState');

// @desc    Get all devices and actuator states
// @route   GET /api/devices
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: Object.values(state.devices),
  });
});

// @desc    Update device state or mode (ON/OFF/AUTO)
// @route   PUT /api/devices/:deviceType
router.put('/:deviceType', (req, res) => {
  try {
    const { deviceType } = req.params;
    const { state: requestedState, mode } = req.body;

    const normalizedType = deviceType.toUpperCase().replace('-', '_');
    const updatedDevice = setDevice(normalizedType, requestedState, mode);

    res.status(200).json({
      success: true,
      message: `${updatedDevice.name} updated to ${updatedDevice.state} (${updatedDevice.mode})`,
      data: updatedDevice,
    });
  } catch (error) {
    console.error('Error updating device:', error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
