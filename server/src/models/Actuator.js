const mongoose = require('mongoose');

const ActuatorSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      enum: ['ON', 'OFF'],
      default: 'OFF',
    },
    mode: {
      type: String,
      enum: ['AUTO', 'MANUAL'],
      default: 'AUTO',
    },
    lastCommand: {
      type: String,
      default: null,
    },
    lastConfirmedState: {
      type: String,
      default: 'OFF',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Actuator', ActuatorSchema);
