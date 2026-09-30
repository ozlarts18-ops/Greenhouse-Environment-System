import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import LiveEnvironment from './components/LiveEnvironment';
import DeviceControls from './components/DeviceControls';
import AnalyticsSection from './components/AnalyticsSection';
import CropMonitoringAi from './components/CropMonitoringAi';
import PestMonitoringAi from './components/PestMonitoringAi';
import AlertsSection from './components/AlertsSection';
import PlantHourlyHistory from './components/PlantHourlyHistory';
import AutomationActivity from './components/AutomationActivity';
import SystemSection from './components/SystemSection';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import {
  getLatestSensors,
  getSensorsHistory,
  getDevices,
  updateDevice,
  getSystemStatus,
  getActivityLog,
  getAlerts,
  getHourlyPlantSnapshots,
  getLatestCropDiagnosis,
  getLatestPestDetection,
  subscribeToRealtimeStream,
} from './services/api';

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [telemetry, setTelemetry] = useState({});
  const [devices, setDevices] = useState([]);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [hourlySnapshots, setHourlySnapshots] = useState([]);
  const [activityEvents, setActivityEvents] = useState([]);
  const [systemData, setSystemData] = useState({});
  const [latestCrop, setLatestCrop] = useState(null);
  const [latestPest, setLatestPest] = useState(null);

  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingDevice, setIsUpdatingDevice] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('greenhouse_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem('greenhouse_auth_token');
    localStorage.removeItem('greenhouse_user');
    setCurrentUser(null);
    addToast('Signed out of session', 'info');
  };

  // Master fetch function
  const fetchAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [
        sensorRes,
        historyRes,
        devicesRes,
        alertsRes,
        snapshotsRes,
        systemRes,
        activityRes,
      ] = await Promise.allSettled([
        getLatestSensors(),
        getSensorsHistory(),
        getDevices(),
        getAlerts(),
        getHourlyPlantSnapshots(),
        getSystemStatus(),
        getActivityLog(),
      ]);

      // Telemetry
      if (sensorRes.status === 'fulfilled' && sensorRes.value?.success) {
        setTelemetry(sensorRes.value.data || {});
        setIsConnected(!!sensorRes.value.connected);
        setLastSync(sensorRes.value.timestamp || new Date().toISOString());
      } else {
        setIsConnected(false);
      }

      // History for charts
      if (historyRes.status === 'fulfilled' && historyRes.value?.success) {
        setHistory(historyRes.value.data || []);
      }

      // Devices
      if (devicesRes.status === 'fulfilled' && devicesRes.value?.success) {
        setDevices(devicesRes.value.data || []);
      }

      // Alerts
      if (alertsRes.status === 'fulfilled' && alertsRes.value?.success) {
        setAlerts(alertsRes.value.data || []);
      }

      // Hourly Snapshots
      if (snapshotsRes.status === 'fulfilled' && snapshotsRes.value?.success) {
        setHourlySnapshots(snapshotsRes.value.data || []);
      }

      // System
      if (systemRes.status === 'fulfilled' && systemRes.value?.success) {
        setSystemData(systemRes.value);
      }

      // Activity
      if (activityRes.status === 'fulfilled' && activityRes.value?.success) {
        setActivityEvents(activityRes.value.data || []);
      }
    } catch (err) {
      console.error('Error fetching greenhouse data:', err);
      setIsConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Real-Time Event Stream (SSE) & Fallback Polling
  useEffect(() => {
    fetchAllData();

    // Initial AI caches
    getLatestCropDiagnosis()
      .then((res) => { if (res.data) setLatestCrop(res.data); })
      .catch(() => {});

    getLatestPestDetection()
      .then((res) => { if (res.data) setLatestPest(res.data); })
      .catch(() => {});

    // Subscribe to SSE real-time stream
    const eventSource = subscribeToRealtimeStream((msg) => {
      if (msg.type === 'init') {
        if (msg.data.telemetry) setTelemetry(msg.data.telemetry);
        setIsConnected(!!msg.data.connected);
        if (msg.data.lastSync) setLastSync(msg.data.lastSync);
        if (msg.data.devices) setDevices(Object.values(msg.data.devices));
        if (msg.data.alerts) setAlerts(msg.data.alerts);
        if (msg.data.history) setHistory(msg.data.history);
      } else if (msg.type === 'telemetry') {
        if (msg.data.telemetry) setTelemetry(msg.data.telemetry);
        setIsConnected(!!msg.data.connected);
        if (msg.data.timestamp) setLastSync(msg.data.timestamp);
        if (msg.data.devices) setDevices(Object.values(msg.data.devices));
      } else if (msg.type === 'devices') {
        if (msg.data) setDevices(Object.values(msg.data));
      } else if (msg.type === 'alert') {
        setAlerts((prev) => [msg.data, ...prev]);
        addToast(`Alert: ${msg.data.title}`, msg.data.severity === 'CRITICAL' ? 'error' : 'warning');
      } else if (msg.type === 'alert_resolved') {
        setAlerts((prev) =>
          prev.map((a) => (a.id === msg.data.id ? { ...a, resolved: true } : a))
        );
      } else if (msg.type === 'activity') {
        setActivityEvents((prev) => [msg.data, ...prev.slice(0, 59)]);
      } else if (msg.type === 'snapshot') {
        setHourlySnapshots((prev) => [msg.data, ...prev.slice(0, 99)]);
      }
    });

    // Fallback polling every 8s
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 8000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [fetchAllData]);

  // Handle Actuator State / Mode Changes
  const handleUpdateDevice = async (deviceType, payload) => {
    try {
      setIsUpdatingDevice(true);
      const res = await updateDevice(deviceType, payload);
      if (res.success && res.data) {
        setDevices((prev) =>
          prev.map((d) => (d.type === res.data.type ? res.data : d))
        );
        addToast(res.message, 'success');
        fetchAllData(true);
      }
    } catch (err) {
      console.error('Failed to update device:', err);
      addToast(err?.response?.data?.message || 'Failed to update device command', 'error');
    } finally {
      setIsUpdatingDevice(false);
    }
  };

  const activeAlertsCount = alerts.filter((a) => !a.resolved).length;

  const handleScrollToAlerts = () => {
    setActiveSection('alerts');
    const el = document.getElementById('alerts');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="iotrex-app">
      {/* Navigation Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        activeAlertsCount={activeAlertsCount}
      />

      {/* Main Content Area */}
      <div className="iotrex-main">
        {/* 1. Header */}
        <Header
          isConnected={isConnected}
          lastSync={lastSync}
          isRefreshing={isRefreshing}
          onRefresh={() => {
            fetchAllData(false);
            addToast('Synchronizing greenhouse telemetry...', 'info');
          }}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          activeAlertsCount={activeAlertsCount}
          onScrollToAlerts={handleScrollToAlerts}
        />

        <main className="content-wrapper">
          {/* 2. Dashboard Overview */}
          <DashboardOverview
            telemetry={telemetry}
            isConnected={isConnected}
          />

          {/* 3. Live Environment */}
          <LiveEnvironment
            telemetry={telemetry}
            isConnected={isConnected}
          />

          {/* 4. Actuator Controls */}
          <DeviceControls
            devices={devices}
            onUpdateDevice={handleUpdateDevice}
            isUpdating={isUpdatingDevice}
          />

          {/* 5. Analytics */}
          <AnalyticsSection history={history} />

          {/* 6. Crop Monitoring AI */}
          <CropMonitoringAi
            latestDiagnosis={latestCrop}
            onDiagnosisComplete={(data) => {
              setLatestCrop(data);
              fetchAllData(true);
              addToast('Crop foliage analysis complete', 'success');
            }}
            onSnapshotSaved={() => fetchAllData(true)}
          />

          {/* 7. Pest Monitoring AI */}
          <PestMonitoringAi
            latestPestDetection={latestPest}
            onDetectionComplete={(data) => {
              setLatestPest(data);
              fetchAllData(true);
              if (data.hasPests) {
                addToast(`Pest AI detected ${data.pestCount} specimen!`, 'error');
              } else {
                addToast('Pest AI scan: No pests detected', 'success');
              }
            }}
          />

          {/* 8. Alerts */}
          <AlertsSection
            alerts={alerts}
            onAlertsUpdated={() => fetchAllData(true)}
          />

          {/* 9. Plant Growth History Archive */}
          <PlantHourlyHistory
            snapshots={hourlySnapshots}
            onSnapshotSaved={() => {
              fetchAllData(true);
              addToast('Hourly plant update archived', 'success');
            }}
          />

          {/* 10. Automation Activity */}
          <AutomationActivity events={activityEvents} />

          {/* 11. System Health */}
          <SystemSection systemData={systemData} />
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          addToast(`Welcome back, ${user.name}!`, 'success');
        }}
      />

      {/* Toast System */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
