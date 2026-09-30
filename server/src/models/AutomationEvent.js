const mongoose = require('mongoose');

const AutomationEventSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    previousState: {
      type: String,
      default: 'OFF',
    },
    newState: {
      type: String,
      default: 'ON',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AutomationEventSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('AutomationEvent', AutomationEventSchema);
