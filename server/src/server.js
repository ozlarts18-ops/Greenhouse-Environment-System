const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const alertRoutes = require('./routes/alertRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const aiRoutes = require('./routes/aiRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { router: cameraRoutes } = require('./routes/cameraRoutes');
const realtimeRoutes = require('./routes/realtimeRoutes');
const { state, isHardwareOnline } = require('./services/greenhouseState');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve uploaded static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  const isOnline = isHardwareOnline();
  res.status(200).json({
    status: 'online',
    app: 'Smart Greenhouse Automation System',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    hardwareConnection: {
      connected: isOnline,
      lastSync: state.gateway.lastSync,
    },
    version: '2.0.0',
    nodeVersion: process.version,
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/camera', cameraRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/events', realtimeRoutes);
app.use('/api', aiRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/activity', (req, res) => res.redirect('/api/system/activity'));

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    title: 'Smart Greenhouse Automation System API',
    subtitle: 'Smart Greenhouse Automation',
    endpoints: {
      health: '/api/health',
      realtimeStream: '/api/realtime/stream',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
      alerts: {
        all: '/api/alerts',
        active: '/api/alerts/active',
      },
      sensors: {
        latest: '/api/sensors/latest',
        history: '/api/sensors/history',
        gateway: 'POST /api/sensors/gateway',
      },
      devices: '/api/devices',
      ai: {
        cropHealthDiagnose: 'POST /api/crop-health/diagnose',
        cropSnapshots: 'GET /api/crop-health/snapshots',
        pestDetect: 'POST /api/pests/detect',
        pestLatest: '/api/pests/latest',
      },
      system: '/api/system/status',
      activity: '/api/system/activity',
    },
  });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` 🌿 Smart Greenhouse Automation System running on port ${PORT}`);
  console.log(` 📡 Cloud Gateway Ingestion: http://localhost:${PORT}/api/sensors/gateway`);
  console.log(` ⚡ Real-Time SSE Stream: http://localhost:${PORT}/api/realtime/stream`);
  console.log(` 🧠 AI Microservice Engine: ${process.env.AI_SERVER_URL || 'http://localhost:8001'}`);
  console.log(`====================================================`);
});
