const express = require('express');
const router = express.Router();
const { state, isHardwareOnline } = require('../services/greenhouseState');
const { checkAiHealth } = require('../services/aiService');

// High-Level Subsystems Configuration
const GREENHOUSE_SUBSYSTEMS = [
  { name: 'Supplemental Grow Lighting', category: 'Illumination', description: 'Maintains optimal photoperiod when ambient sunlight drops below 400 lux.' },
  { name: 'Automated Drip Irrigation', category: 'Moisture Control', description: 'Delivers root-zone hydration whenever soil moisture reaches dry status with 60s cooldown.' },
  { name: 'Climate & Thermal Ventilation', category: 'Environment', description: 'Regulates heat accumulation via automatic canopy exhaust fan at 30°C threshold.' },
  { name: 'Reservoir Level Management', category: 'Water Supply', description: 'Monitors tank depth and controls automatic refill motor to maintain water security.' },
];

const AUTOMATION_RULES = [
  { subsystem: 'Grow Lighting', rule: 'Turn ON when light < 400 lux | Turn OFF when light > 600 lux', benefit: 'Energy-efficient growth light regulation with hysteresis buffer.' },
  { subsystem: 'Water Reservoir', rule: 'Refill ON when level drops | Stop automatically when 100% full', benefit: 'Guarantees continuous water supply for irrigation.' },
  { subsystem: 'Drip Irrigation', rule: 'Activate pump for 5s upon Dry reading | 60s soak cooldown', benefit: 'Prevents soil saturation and root rot while ensuring adequate moisture.' },
  { subsystem: 'Thermal Ventilation', rule: 'Fan ON at ≥ 30°C | Fan OFF at ≤ 28°C', benefit: 'Prevents plant heat stress and fungal mold build-up.' },
];

// @desc    Get complete greenhouse system diagnostic status
// @route   GET /api/system/status
router.get('/status', async (req, res) => {
  const aiHealth = await checkAiHealth();
  const t = state.telemetry;
  const isOnline = isHardwareOnline();

  res.status(200).json({
    success: true,
    systemName: 'Smart Greenhouse Automation System',
    hardwareStream: {
      connected: isOnline,
      status: isOnline ? 'Online (Streaming Telemetry)' : 'Offline / Standby (Awaiting Hardware Connection)',
      lastSync: state.gateway.lastSync,
      source: state.gateway.source,
    },
    sensors: {
      dht22: { name: 'Climate Sensor (Temp & Humidity)', connected: isOnline && !!t.sensorOk?.dht22, value: isOnline && t.temperature !== null ? `${t.temperature}°C / ${t.humidity}%` : 'Unavailable' },
      bh1750: { name: 'Ambient Light Intensity Sensor', connected: isOnline && !!t.sensorOk?.bh1750, value: isOnline && t.lux !== null ? `${t.lux} lux` : 'Unavailable' },
      ads1115: { name: 'Soil Moisture Interface', connected: isOnline && !!t.sensorOk?.ads1115, value: isOnline && t.soilRaw !== null ? `ADC: ${t.soilRaw}` : 'Unavailable' },
      ultrasonic: { name: 'Water Tank Level Sensor', connected: isOnline && !!t.sensorOk?.ultrasonic, value: isOnline && t.tankDistanceCm !== null ? `${t.tankDistanceCm} cm (${t.tankPercent}%)` : 'Unavailable' },
      lcd: { name: 'Onboard Status Display', connected: isOnline && !!t.sensorOk?.lcd, value: isOnline ? 'Operational' : 'Unavailable' },
    },
    aiServices: {
      connected: aiHealth.connected,
      url: aiHealth.url,
      pestModel: aiHealth.pest_model || { status: 'OFFLINE' },
      diseaseModel: aiHealth.disease_model || { status: 'OFFLINE' },
    },
    subsystems: GREENHOUSE_SUBSYSTEMS,
    automationRules: AUTOMATION_RULES,
    remoteCloudSync: {
      status: 'Ready',
      cloudGatewayEndpoint: '/api/sensors/gateway',
      notes: 'Raspberry Pi streams data to cloud API over any local Wi-Fi or cellular hotspot.',
    },
  });
});

// @desc    Get automation activity event log
// @route   GET /api/activity
router.get('/activity', (req, res) => {
  res.status(200).json({
    success: true,
    count: state.activityLog.length,
    data: state.activityLog,
  });
});

module.exports = router;
