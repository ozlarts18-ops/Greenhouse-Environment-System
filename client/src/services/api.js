import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Add Authorization header from localStorage if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('greenhouse_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication
export const loginUser = async (email, password) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const registerUser = async (userData) => {
  const res = await api.post('/auth/register', userData);
  return res.data;
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

// Alerts
export const getAlerts = async () => {
  const res = await api.get('/alerts');
  return res.data;
};

export const getActiveAlerts = async () => {
  const res = await api.get('/alerts/active');
  return res.data;
};

export const resolveAlert = async (alertId) => {
  const res = await api.post(`/alerts/${alertId}/resolve`);
  return res.data;
};

// System & Health
export const getSystemHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export const getSystemStatus = async () => {
  const res = await api.get('/system/status');
  return res.data;
};

export const getActivityLog = async () => {
  const res = await api.get('/system/activity');
  return res.data;
};

// Sensors
export const getLatestSensors = async () => {
  const res = await api.get('/sensors/latest');
  return res.data;
};

export const getSensorsHistory = async (range = '1H') => {
  const res = await api.get(`/sensors/history?range=${encodeURIComponent(range)}`);
  return res.data;
};

// Devices
export const getDevices = async () => {
  const res = await api.get('/devices');
  return res.data;
};

export const updateDevice = async (deviceType, payload) => {
  const res = await api.put(`/devices/${deviceType}`, payload);
  return res.data;
};

// Crop AI & Hourly Snapshots
export const diagnoseCropImage = async (file, archiveHourly = false) => {
  const formData = new FormData();
  formData.append('image', file);
  if (archiveHourly) {
    formData.append('archiveHourly', 'true');
  }
  const res = await api.post('/crop-health/diagnose', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getLatestCropDiagnosis = async () => {
  const res = await api.get('/crop-health/latest');
  return res.data;
};

export const getHourlyPlantSnapshots = async () => {
  const res = await api.get('/crop-health/snapshots');
  return res.data;
};

export const saveHourlyPlantSnapshot = async (data) => {
  const res = await api.post('/crop-health/snapshots', data);
  return res.data;
};

// Pest AI
export const detectPestImage = async (file, conf = 0.35) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post(`/pests/detect?conf=${conf}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getLatestPestDetection = async () => {
  const res = await api.get('/pests/latest');
  return res.data;
};

// Camera & Remote Stream
export const getCameraStatus = async () => {
  const res = await api.get('/camera/status');
  return res.data;
};

export const captureRemoteCameraAi = async (targetAi = 'crop', conf = 0.35) => {
  const res = await api.post('/camera/capture-ai', { targetAi, conf });
  return res.data;
};

// Real-Time Event Stream Connection (SSE)
export const subscribeToRealtimeStream = (onMessage, onError) => {
  try {
    const eventSource = new EventSource('/api/realtime/stream');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (onMessage) onMessage(payload);
      } catch (err) {
        console.warn('Error parsing SSE payload:', err);
      }
    };
    eventSource.onerror = (err) => {
      if (onError) onError(err);
    };
    return eventSource;
  } catch (err) {
    console.warn('SSE not supported or failed to initialize:', err);
    return null;
  }
};

export default api;

