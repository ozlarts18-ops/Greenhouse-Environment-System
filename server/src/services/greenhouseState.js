const EventEmitter = require('events');
const mongoose = require('mongoose');

// Real-time Event Emitter for SSE & WebSockets
const stateEmitter = new EventEmitter();
stateEmitter.setMaxListeners(100);

// Default initial state
const state = {
  telemetry: {
    temperature: null,
    humidity: null,
    lux: null,
    tankDistanceCm: null,
    tankPercent: null,
    soilRaw: null,
    soilVoltage: null,
    soilStatus: 'UNKNOWN', // 'DRY' | 'WET/NORMAL' | 'UNKNOWN'
    naturalLight: 'Unknown',
    timestamp: null,
    sensorOk: {
      dht22: false,
      bh1750: false,
      ads1115: false,
      ultrasonic: false,
      lcd: false,
    },
  },
  devices: {
    GROW_LIGHT: {
      name: 'Supplemental Grow Light',
      type: 'GROW_LIGHT',
      state: 'OFF', // 'ON' | 'OFF'
      mode: 'AUTO',  // 'AUTO' | 'MANUAL'
      reason: 'Awaiting hardware sync',
      rule: '< 400 lux → ON | > 600 lux → OFF',
      status: 'confirmed', // 'pending' | 'confirmed'
      lastChanged: new Date().toISOString(),
    },
    TANK_MOTOR: {
      name: 'Water Reservoir Management',
      type: 'TANK_MOTOR',
      state: 'OFF',
      mode: 'AUTO',
      reason: 'Awaiting water tank sensor',
      rule: 'Distance >= 5 cm → ON (Refilling) | < 5 cm → OFF (100% Full)',
      status: 'confirmed',
      lastChanged: new Date().toISOString(),
    },
    SOIL_PUMP: {
      name: 'Automated Drip Irrigation',
      type: 'SOIL_PUMP',
      state: 'OFF',
      mode: 'AUTO',
      reason: 'Soil moisture adequate',
      rule: 'Moisture DRY (ADC > 8000) → 5s Watering | 60s Cooldown',
      status: 'confirmed',
      wateringRemaining: 0,
      cooldownRemaining: 0,
      lastChanged: new Date().toISOString(),
    },
    FAN: {
      name: 'Climate & Thermal Ventilation',
      type: 'FAN',
      state: 'OFF',
      mode: 'AUTO',
      reason: 'Greenhouse climate normal',
      rule: '≥ 30°C → ON | ≤ 28°C → OFF',
      status: 'confirmed',
      lastChanged: new Date().toISOString(),
    },
  },
  pendingCommands: {}, // Pending commands waiting for physical Raspberry Pi confirmation
  gateway: {
    connected: false,
    lastSync: null,
    source: 'None',
    url: process.env.RPI_GATEWAY_URL || 'http://localhost:5000/api/sensors/gateway',
    aiServerUrl: process.env.AI_SERVER_URL || 'http://localhost:8001',
  },
  history: [], // time-series buffer (max 100 points)
  activityLog: [], // recent events (max 60)
  alerts: [], // live alert items (max 50)
  hourlySnapshots: [], // archived hourly plant photos & growth records (max 100)
};

// Soil pump timer tracking
let wateringTimer = null;
let cooldownTimer = null;

// Helper: Check if hardware connection is actively streaming (last sync within 45s)
function isHardwareOnline() {
  if (!state.gateway.lastSync) return false;
  const elapsedMs = Date.now() - new Date(state.gateway.lastSync).getTime();
  return elapsedMs < 45000;
}

function addActivity(type, message, component = 'System', value = '') {
  const event = {
    id: 'evt-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    type, // 'Sensor' | 'Automation' | 'Manual' | 'Error'
    message,
    component,
    value,
  };
  state.activityLog.unshift(event);
  if (state.activityLog.length > 60) {
    state.activityLog.pop();
  }
  stateEmitter.emit('activity', event);
}

function addAlert(title, message, severity = 'WARNING', component = 'System') {
  const existing = state.alerts.find((a) => a.title === title && !a.resolved);
  if (existing) {
    existing.timestamp = new Date().toISOString();
    return existing;
  }

  const alertItem = {
    id: 'alt-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    title,
    message,
    severity, // 'CRITICAL' | 'WARNING' | 'INFO'
    component,
    resolved: false,
    timestamp: new Date().toISOString(),
  };

  state.alerts.unshift(alertItem);
  if (state.alerts.length > 50) {
    state.alerts.pop();
  }

  // Persist to MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const Alert = require('../models/Alert');
      Alert.create({
        type: component.toLowerCase().replace(/\s+/g, '_'),
        severity: severity.toLowerCase(),
        title,
        message,
        source: 'Automated Rule Engine',
        status: 'active',
        created_at: new Date(),
      }).catch(() => {});
    } catch {}
  }

  addActivity('Error', `Alert: ${title} (${severity})`, component);
  stateEmitter.emit('alert', alertItem);
  return alertItem;
}

function resolveAlert(alertId) {
  const alert = state.alerts.find((a) => a.id === alertId);
  if (alert) {
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    stateEmitter.emit('alert_resolved', alert);
  }
  return alert;
}

// Convert distance to tank percentage (5 cm = 100%, 30 cm = 0%)
function calculateTankPercent(distanceCm) {
  if (distanceCm === null || distanceCm === undefined || isNaN(distanceCm)) {
    return null;
  }
  const minCm = 5;  // 100%
  const maxCm = 30; // 0%
  if (distanceCm <= minCm) return 100;
  if (distanceCm >= maxCm) return 0;
  const pct = ((maxCm - distanceCm) / (maxCm - minCm)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

// Update telemetry from Raspberry Pi and process confirmed hardware states
function updateTelemetry(payload) {
  const now = new Date();
  state.gateway.connected = true;
  state.gateway.lastSync = now.toISOString();
  state.gateway.source = payload.source || 'Raspberry Pi Cloud Gateway';

  // Normalize incoming payload
  const t = state.telemetry;

  if (payload.lux !== undefined || payload.light?.lux !== undefined) {
    const rawLux = payload.lux !== undefined ? payload.lux : payload.light?.lux;
    t.lux = rawLux !== null ? Number(rawLux) : null;
    t.sensorOk.bh1750 = t.lux !== null;
    t.naturalLight = t.lux !== null ? (t.lux < 400 ? 'Insufficient' : 'Sufficient') : 'Unknown';
  }

  if (payload.tank || payload.distance_cm !== undefined || payload.tankDistanceCm !== undefined) {
    const dist = payload.distance_cm ?? payload.tankDistanceCm ?? payload.tank?.distance_cm;
    t.tankDistanceCm = dist !== null && dist !== undefined ? Number(dist) : null;
    t.tankPercent = calculateTankPercent(t.tankDistanceCm);
    t.sensorOk.ultrasonic = t.tankDistanceCm !== null;

    if (t.tankPercent !== null && t.tankPercent < 20) {
      addAlert(
        'Water Tank Critical Low',
        `Water tank level is at ${t.tankPercent}%. Refill reservoir required.`,
        'CRITICAL',
        'Water Tank'
      );
    }
  }

  if (payload.soil || payload.soilRaw !== undefined || payload.soil_raw !== undefined) {
    const raw = payload.soilRaw ?? payload.soil_raw ?? payload.soil?.raw;
    const volt = payload.soilVoltage ?? payload.soil_voltage ?? payload.soil?.voltage;
    t.soilRaw = raw !== null && raw !== undefined ? Number(raw) : null;
    t.soilVoltage = volt !== null && volt !== undefined ? Number(volt) : null;
    t.sensorOk.ads1115 = t.soilRaw !== null;
    t.soilStatus = t.soilRaw !== null ? (t.soilRaw > 8000 ? 'DRY' : 'WET/NORMAL') : 'UNKNOWN';

    if (t.soilStatus === 'DRY') {
      addAlert(
        'Soil Moisture Depleted',
        `Soil sensor reading (${t.soilRaw}) is above dry threshold 8000. Drip irrigation triggered.`,
        'WARNING',
        'Irrigation'
      );
    }
  }

  if (payload.climate || payload.temperature !== undefined || payload.humidity !== undefined) {
    const temp = payload.temperature ?? payload.climate?.temperature;
    const hum = payload.humidity ?? payload.climate?.humidity;
    t.temperature = temp !== null && temp !== undefined ? Number(temp) : null;
    t.humidity = hum !== null && hum !== undefined ? Number(hum) : null;
    t.sensorOk.dht22 = t.temperature !== null && t.humidity !== null;

    if (t.temperature !== null && t.temperature >= 35.0) {
      addAlert(
        'Greenhouse Heat Stress',
        `Canopy temperature has reached ${t.temperature}°C (High threshold >= 35°C). Ventilation fan engaged.`,
        'WARNING',
        'Climate'
      );
    }
  }

  t.sensorOk.lcd = payload.lcd_ok ?? true;
  t.timestamp = now.toISOString();

  // Process physical confirmed relay feedback from Pi
  processConfirmedRelays(payload);

  // If devices are in AUTO mode and Pi didn't dictate, run auto rules
  runAutomationRules();

  // Record historical sample
  recordHistorySample();

  // Emit real-time telemetry event
  stateEmitter.emit('telemetry', {
    telemetry: t,
    connected: isHardwareOnline(),
    devices: state.devices,
    timestamp: t.timestamp,
  });
}

function processConfirmedRelays(payload) {
  const confirmedRelays = payload.relays || {};

  // Check individual module states if provided
  if (payload.light?.light_status) confirmedRelays.GROW_LIGHT = payload.light.light_status;
  if (payload.tank?.motor) confirmedRelays.TANK_MOTOR = payload.tank.motor;
  if (payload.soil?.pump) confirmedRelays.SOIL_PUMP = payload.soil.pump;
  if (payload.climate?.fan) confirmedRelays.FAN = payload.climate.fan;

  for (const [devType, confirmedState] of Object.entries(confirmedRelays)) {
    const dev = state.devices[devType];
    if (dev) {
      const normalizedConfirmed = confirmedState.toUpperCase() === 'ON' ? 'ON' : 'OFF';
      dev.state = normalizedConfirmed;

      // Check if this confirms a pending command
      if (state.pendingCommands[devType]) {
        const pending = state.pendingCommands[devType];
        if (!pending.state || pending.state === normalizedConfirmed) {
          delete state.pendingCommands[devType];
          dev.status = 'confirmed';
          dev.lastConfirmedState = normalizedConfirmed;
          dev.lastChanged = new Date().toISOString();

          addActivity('Manual', `${dev.name} physical state confirmed: ${normalizedConfirmed}`, dev.name, normalizedConfirmed);

          // Update MongoDB command status
          if (mongoose.connection.readyState === 1) {
            try {
              const DeviceCommand = require('../models/DeviceCommand');
              DeviceCommand.updateOne(
                { deviceId: devType, status: 'pending' },
                { $set: { status: 'confirmed', confirmedAt: new Date() } }
              ).catch(() => {});
            } catch {}
          }
        }
      } else {
        dev.status = 'confirmed';
      }
    }
  }
}

function recordHistorySample() {
  const t = state.telemetry;
  const sample = {
    timestamp: new Date().toISOString(),
    timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    temperature: t.temperature,
    humidity: t.humidity,
    lux: t.lux,
    tankPercent: t.tankPercent,
    tankDistanceCm: t.tankDistanceCm,
    soilRaw: t.soilRaw,
    soilVoltage: t.soilVoltage,
  };

  state.history.push(sample);
  if (state.history.length > 100) {
    state.history.shift();
  }

  // Persist to MongoDB if active
  if (mongoose.connection.readyState === 1) {
    try {
      const SensorReading = require('../models/SensorReading');
      SensorReading.create({
        temperature: t.temperature,
        humidity: t.humidity,
        lightLux: t.lux,
        soilAdc: t.soilRaw,
        soilVoltage: t.soilVoltage,
        tankDistanceCm: t.tankDistanceCm,
        tankLevelPercent: t.tankPercent,
        timestamp: new Date(),
      }).catch(() => {});
    } catch {}
  }
}

// Evaluate Automation Rules
function runAutomationRules() {
  const t = state.telemetry;

  // 1. Grow Light: < 400 lux -> ON, > 600 lux -> OFF (Hysteresis)
  const light = state.devices.GROW_LIGHT;
  if (light.mode === 'AUTO') {
    if (t.lux !== null) {
      if (t.lux < 400 && light.state !== 'ON') {
        light.reason = `Ambient light (${t.lux} lux) < 400 lux threshold`;
      } else if (t.lux > 600 && light.state !== 'OFF') {
        light.reason = `Ambient light (${t.lux} lux) > 600 lux threshold`;
      }
    } else {
      light.reason = 'Lux sensor offline';
    }
  }

  // 2. Tank Motor: Distance >= 5 cm -> ON (Refilling), < 5 cm -> OFF (Full)
  const motor = state.devices.TANK_MOTOR;
  if (motor.mode === 'AUTO') {
    if (t.tankDistanceCm !== null) {
      if (t.tankDistanceCm >= 5 && motor.state !== 'ON') {
        motor.reason = `Tank level (${t.tankPercent}%, ${t.tankDistanceCm}cm) requires refill`;
      } else if (t.tankDistanceCm < 5 && motor.state !== 'OFF') {
        motor.reason = `Tank is 100% full (distance ${t.tankDistanceCm}cm <= 5cm)`;
      }
    } else {
      motor.reason = 'Failsafe: Water level sensor offline';
    }
  }

  // 3. Soil Pump
  const pump = state.devices.SOIL_PUMP;
  if (pump.mode === 'AUTO') {
    if (t.soilRaw !== null) {
      if (t.soilRaw > 8000) {
        pump.reason = `Soil dry (reading: ${t.soilRaw}) -> Irrigation loop`;
      } else {
        pump.reason = `Soil moisture adequate (reading: ${t.soilRaw} <= 8000)`;
      }
    } else {
      pump.reason = 'Soil moisture sensor offline';
    }
  }

  // 4. Fan
  const fan = state.devices.FAN;
  if (fan.mode === 'AUTO') {
    if (t.temperature !== null) {
      if (t.temperature >= 30.0 && fan.state !== 'ON') {
        fan.reason = `Temperature (${t.temperature}°C) >= 30.0°C threshold`;
      } else if (t.temperature <= 28.0 && fan.state !== 'OFF') {
        fan.reason = `Temperature (${t.temperature}°C) <= 28.0°C threshold`;
      }
    } else {
      fan.reason = 'Temperature sensor offline';
    }
  }
}

// Remote Manual Actuator Command - Queue for Raspberry Pi confirmation
function setDevice(deviceType, requestedState, mode, requestedBy = 'Remote Dashboard Operator') {
  const dev = state.devices[deviceType];
  if (!dev) {
    throw new Error(`Invalid device type: ${deviceType}`);
  }

  const nextMode = mode ? (mode.toUpperCase() === 'AUTO' ? 'AUTO' : 'MANUAL') : dev.mode;
  let nextState = dev.state;

  if (requestedState !== undefined && requestedState !== null) {
    nextState = (requestedState === true || requestedState === 'ON' || requestedState === 'true') ? 'ON' : 'OFF';
  }

  // Queue command for physical Raspberry Pi confirmation
  const commandPayload = {
    commandId: 'cmd-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    deviceId: deviceType,
    state: nextState,
    mode: nextMode,
    requestedBy,
    timestamp: new Date().toISOString(),
  };

  state.pendingCommands[deviceType] = commandPayload;
  dev.state = nextState;
  dev.mode = nextMode;
  dev.status = 'pending'; // Mark pending until Raspberry Pi physically confirms relay state
  dev.lastChanged = new Date().toISOString();
  dev.reason = nextMode === 'MANUAL' ? `Manual Override: Set to ${nextState}` : 'Switched to AUTO automation loop';

  if (nextMode === 'AUTO') {
    runAutomationRules();
  }

  addActivity(
    'Manual',
    `Remote command dispatched: ${dev.name} -> ${nextState} (${nextMode})`,
    dev.name,
    nextState
  );

  // Record command audit in MongoDB
  if (mongoose.connection.readyState === 1) {
    try {
      const DeviceCommand = require('../models/DeviceCommand');
      DeviceCommand.create({
        deviceId: deviceType,
        requestedState: nextState,
        requestedMode: nextMode,
        requestedBy,
        status: 'pending',
        timestamp: new Date(),
      }).catch(() => {});
    } catch {}
  }

  stateEmitter.emit('devices', state.devices);
  return dev;
}

// Save Hourly Plant Snapshot
function addHourlyPlantSnapshot(snapshot) {
  const item = {
    id: 'snap-' + Date.now(),
    timestamp: new Date().toISOString(),
    cropName: snapshot.cropName || snapshot.crop || 'Greenhouse Foliage',
    healthStatus: snapshot.healthStatus || 'Healthy',
    disease: snapshot.disease || 'None',
    confidencePercent: snapshot.confidencePercent || '95.0',
    canopyWidth: snapshot.canopyWidth || snapshot.canopy?.canopy_width || 'N/A',
    canopyLength: snapshot.canopyLength || snapshot.canopy?.canopy_length || 'N/A',
    canopyArea: snapshot.canopyArea || snapshot.canopy?.canopy_area || 'N/A',
    calibration: snapshot.calibration || snapshot.canopy?.calibration || 'Uncalibrated',
    imageUrl: snapshot.imageUrl || '',
    treatment: snapshot.treatment || 'Maintain automated care schedule.',
    triggerType: snapshot.triggerType || 'HOURLY_AUTO',
  };

  state.hourlySnapshots.unshift(item);
  if (state.hourlySnapshots.length > 100) {
    state.hourlySnapshots.pop();
  }

  // Persist to MongoDB if active
  if (mongoose.connection.readyState === 1) {
    try {
      const HourlyPlantSnapshot = require('../models/HourlyPlantSnapshot');
      HourlyPlantSnapshot.create({
        cropName: item.cropName,
        healthStatus: item.healthStatus,
        disease: item.disease,
        confidencePercent: parseFloat(item.confidencePercent) || 95.0,
        canopyWidth: String(item.canopyWidth),
        canopyLength: String(item.canopyLength),
        canopyArea: String(item.canopyArea),
        calibrationStatus: item.calibration,
        imageUrl: item.imageUrl,
        notes: item.treatment,
        timestamp: new Date(),
      }).catch(() => {});
    } catch {}
  }

  addActivity('Sensor', `Hourly Plant Update: ${item.cropName} - ${item.healthStatus}`, 'Crop Health');
  stateEmitter.emit('snapshot', item);
  return item;
}

module.exports = {
  state,
  stateEmitter,
  isHardwareOnline,
  updateTelemetry,
  setDevice,
  addActivity,
  addAlert,
  resolveAlert,
  addHourlyPlantSnapshot,
  recordHistorySample,
};
