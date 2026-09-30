const mongoose = require('mongoose');

const DeviceCommandSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    requestedState: {
      type: String,
      enum: ['ON', 'OFF', null],
      default: null,
    },
    requestedMode: {
      type: String,
      enum: ['AUTO', 'MANUAL'],
      default: 'AUTO',
    },
    requestedBy: {
      type: String,
      default: 'system',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed', 'timeout'],
      default: 'pending',
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

DeviceCommandSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('DeviceCommand', DeviceCommandSchema);
