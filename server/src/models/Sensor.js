const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sensorType: {
      type: String,
      required: true,
      enum: ['temperature', 'humidity', 'light', 'soil_moisture', 'tank_distance', 'tank_level'],
    },
    value: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'error', 'standby'],
      default: 'standby',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Sensor', SensorSchema);
