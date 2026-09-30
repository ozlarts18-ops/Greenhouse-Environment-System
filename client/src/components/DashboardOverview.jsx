import React from 'react';
import { Thermometer, Droplets, Sun, Waves, Shovel } from 'lucide-react';

export default function DashboardOverview({ telemetry = {}, isConnected = false }) {
  const {
    temperature,
    humidity,
    lux,
    tankDistanceCm,
    tankPercent,
    soilRaw,
    soilVoltage,
    soilStatus,
  } = telemetry;

  // Temperature status
  const getTempStatus = (temp) => {
    if (!isConnected || temp === null || temp === undefined) return { label: 'Offline', type: 'unknown' };
    if (temp >= 35.0) return { label: 'High', type: 'high' };
    if (temp < 15.0) return { label: 'Low', type: 'warning' };
    return { label: 'Normal', type: 'normal' };
  };

  // Humidity status
  const getHumStatus = (hum) => {
    if (!isConnected || hum === null || hum === undefined) return { label: 'Offline', type: 'unknown' };
    if (hum > 85.0) return { label: 'High', type: 'high' };
    if (hum < 35.0) return { label: 'Low', type: 'warning' };
    return { label: 'Normal', type: 'normal' };
  };

  // Light status
  const getLightStatus = (l) => {
    if (!isConnected || l === null || l === undefined) return { label: 'Offline', type: 'unknown' };
    if (l < 400) return { label: 'Low (Insufficient)', type: 'warning' };
    return { label: 'Normal (Sufficient)', type: 'normal' };
  };

  // Tank status
  const getTankStatus = (pct, dist) => {
    if (!isConnected || dist === null || dist === undefined) return { label: 'Offline', type: 'unknown' };
    if (pct >= 85) return { label: 'Full', type: 'normal' };
    if (pct >= 30) return { label: 'Medium', type: 'medium' };
    return { label: 'Low', type: 'high' };
  };

  // Soil status
  const getSoilBadge = (raw, status) => {
    if (!isConnected || raw === null || raw === undefined) return { label: 'Offline', type: 'unknown' };
    if (raw > 8000 || status === 'DRY') return { label: 'DRY (Threshold > 8000)', type: 'dry' };
    return { label: 'NORMAL / MOIST', type: 'normal' };
  };

  const tempStat = getTempStatus(temperature);
  const humStat = getHumStatus(humidity);
  const lightStat = getLightStatus(lux);
  const tankStat = getTankStatus(tankPercent, tankDistanceCm);
  const soilStat = getSoilBadge(soilRaw, soilStatus);

  return (
    <section id="dashboard" className="dashboard-section">
      <div className="section-header">
        <h2 className="section-title">
          <span>🏠</span>
          <span>Dashboard Overview</span>
        </h2>
        <p className="section-subtitle">Real-time greenhouse climate telemetry and agricultural environmental sensors</p>
      </div>

      <div className="cards-grid">
        {/* Temperature Card */}
        <div className="clean-card">
          <div className="card-label">
            <span>Temperature</span>
            <Thermometer size={16} color="#475569" />
          </div>
          <div className="card-value">
            {isConnected && temperature !== null && temperature !== undefined ? `${temperature.toFixed(1)} °C` : 'Unavailable'}
          </div>
          <div className={`card-status-badge ${tempStat.type}`}>
            {tempStat.label}
          </div>
        </div>

        {/* Humidity Card */}
        <div className="clean-card">
          <div className="card-label">
            <span>Humidity</span>
            <Droplets size={16} color="#475569" />
          </div>
          <div className="card-value">
            {isConnected && humidity !== null && humidity !== undefined ? `${Math.round(humidity)} %` : 'Unavailable'}
          </div>
          <div className={`card-status-badge ${humStat.type}`}>
            {humStat.label}
          </div>
        </div>

        {/* Light Intensity Card */}
        <div className="clean-card">
          <div className="card-label">
            <span>Light Intensity</span>
            <Sun size={16} color="#475569" />
          </div>
          <div className="card-value">
            {isConnected && lux !== null && lux !== undefined ? `${Math.round(lux)} lux` : 'Unavailable'}
          </div>
          <div className={`card-status-badge ${lightStat.type}`}>
            {lightStat.label}
          </div>
        </div>

        {/* Water Tank Card */}
        <div className="clean-card">
          <div className="card-label">
            <span>Water Tank Level</span>
            <Waves size={16} color="#475569" />
          </div>
          <div className="card-value">
            {isConnected && tankPercent !== null && tankPercent !== undefined ? `${tankPercent} %` : 'Unavailable'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            {isConnected && tankDistanceCm !== null && tankDistanceCm !== undefined ? `Depth: ${tankDistanceCm.toFixed(1)} cm` : 'Reservoir sensor offline'}
          </div>

          <div className="tank-visual-wrapper">
            <div className="tank-bar-track">
              <div
                className="tank-bar-fill"
                style={{
                  width: `${isConnected ? (tankPercent || 0) : 0}%`,
                  backgroundColor: (tankPercent || 0) < 20 ? '#dc2626' : (tankPercent || 0) < 50 ? '#d97706' : '#2563eb',
                }}
              />
            </div>
          </div>

          <div className={`card-status-badge ${tankStat.type}`} style={{ marginTop: '10px' }}>
            {tankStat.label}
          </div>
        </div>

        {/* Soil Moisture Card */}
        <div className="clean-card">
          <div className="card-label">
            <span>Soil Moisture</span>
            <Shovel size={16} color="#475569" />
          </div>
          <div className="card-value">
            {isConnected && soilRaw !== null && soilRaw !== undefined ? `ADC: ${soilRaw}` : 'Unavailable'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            {isConnected && soilVoltage !== null && soilVoltage !== undefined ? `Voltage: ${soilVoltage.toFixed(3)} V` : 'Soil analog interface'}
          </div>
          <div className={`card-status-badge ${soilStat.type}`} style={{ marginTop: '10px' }}>
            {soilStat.label}
          </div>
        </div>
      </div>

      {/* Live Environment Summary Bar */}
      <div
        style={{
          marginTop: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.82rem',
          color: '#475569',
        }}
      >
        <div><strong>Live Environment Telemetry:</strong></div>
        <div>Temp: <strong>{isConnected && temperature !== null ? `${temperature}°C` : 'Unavailable'}</strong></div>
        <div>Humidity: <strong>{isConnected && humidity !== null ? `${humidity}%` : 'Unavailable'}</strong></div>
        <div>Light: <strong>{isConnected && lux !== null ? `${lux} lux` : 'Unavailable'}</strong></div>
        <div>Soil: <strong>{isConnected && soilRaw !== null ? `ADC ${soilRaw}` : 'Unavailable'}</strong></div>
        <div>Tank: <strong>{isConnected && tankPercent !== null ? `${tankPercent}% (${tankDistanceCm} cm)` : 'Unavailable'}</strong></div>
      </div>
    </section>
  );
}
