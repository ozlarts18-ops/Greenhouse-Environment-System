const mongoose = require('mongoose');

const HourlyPlantSnapshotSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    cropName: {
      type: String,
      default: 'Plant Foliage',
    },
    healthStatus: {
      type: String,
      default: 'Healthy',
    },
    disease: {
      type: String,
      default: 'None',
    },
    confidencePercent: {
      type: String,
      default: '95.0',
    },
    canopyWidth: {
      type: String,
      default: 'N/A',
    },
    canopyLength: {
      type: String,
      default: 'N/A',
    },
    canopyArea: {
      type: String,
      default: 'N/A',
    },
    calibration: {
      type: String,
      default: 'Uncalibrated',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    treatment: {
      type: String,
      default: 'Maintain regular automated care schedule.',
    },
    triggerType: {
      type: String,
      enum: ['HOURLY_AUTO', 'MANUAL_CAPTURE'],
      default: 'HOURLY_AUTO',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('HourlyPlantSnapshot', HourlyPlantSnapshotSchema);
