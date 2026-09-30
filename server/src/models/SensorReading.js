const mongoose = require('mongoose');

const SensorReadingSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    greenhouseId: {
      type: String,
      default: 'gh-main-01',
      index: true,
    },
    temperature: {
      type: Number,
      default: null,
    },
    humidity: {
      type: Number,
      default: null,
    },
    lightLux: {
      type: Number,
      default: null,
    },
    soilAdc: {
      type: Number,
      default: null,
    },
    soilVoltage: {
      type: Number,
      default: null,
    },
    tankDistanceCm: {
      type: Number,
      default: null,
    },
    tankLevelPercent: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

SensorReadingSchema.index({ greenhouseId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorReading', SensorReadingSchema);
