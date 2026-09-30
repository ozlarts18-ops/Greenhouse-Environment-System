import React from 'react';
import { Thermometer, Droplets, Sun, Shovel, Ruler, Waves } from 'lucide-react';

export default function LiveEnvironment({ telemetry = {}, isConnected = false }) {
  const {
    temperature,
    humidity,
    lux,
    tankDistanceCm,
    tankPercent,
    soilRaw,
    naturalLight,
    soilStatus,
  } = telemetry;

  return (
    <section id="environment" className="dashboard-section">
      <div className="section-header">
        <h2 className="section-title">
          <span>🌱</span>
          <span>Live Environment</span>
        </h2>
        <p className="section-subtitle">
          High-precision ambient environmental sensor telemetry stream
        </p>
      </div>

      <div className="environment-card-wrapper">
        <div className="environment-large-card">
          <div className="env-header-row">
            <div>
              <div className="env-card-heading">ENVIRONMENT</div>
              <div className="env-card-subheading">Greenhouse Atmospheric & Substrate Telemetry</div>
            </div>
            <div className="env-live-indicator">
              <span className={`status-dot ${isConnected ? 'online' : 'standby'}`} />
              <span>{isConnected ? 'LIVE FEED' : 'HARDWARE STANDBY'}</span>
            </div>
          </div>

          <div className="env-metrics-grid">
            {/* Temperature */}
            <div className="env-metric-item">
              <div className="env-metric-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
                <Thermometer size={20} />
              </div>
              <div className="env-metric-content">
                <div className="env-metric-label">Temperature</div>
                <div className="env-metric-value">
                  {isConnected && temperature !== null && temperature !== undefined
                    ? `${temperature.toFixed(1)} °C`
                    : 'Unavailable'}
                </div>
                <div className="env-metric-meta">Canopy ambient thermal sensor</div>
              </div>
            </div>

            {/* Humidity */}
            <div className="env-metric-item">
              <div className="env-metric-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Droplets size={20} />
              </div>
              <div className="env-metric-content">
                <div className="env-metric-label">Humidity</div>
                <div className="env-metric-value">
                  {isConnected && humidity !== null && humidity !== undefined
                    ? `${Math.round(humidity)} %`
                    : 'Unavailable'}
                </div>
                <div className="env-metric-meta">Relative atmospheric moisture</div>
              </div>
            </div>

            {/* Light Intensity */}
            <div className="env-metric-item">
              <div className="env-metric-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
                <Sun size={20} />
              </div>
              <div className="env-metric-content">
                <div className="env-metric-label">Light Intensity</div>
                <div className="env-metric-value">
                  {isConnected && lux !== null && lux !== undefined
                    ? `${Math.round(lux)} lux`
                    : 'Unavailable'}
                </div>
                <div className="env-metric-meta">Solar lux & PAR illumination ({naturalLight})</div>
              </div>
            </div>

            {/* Soil Reading */}
            <div className="env-metric-item">
              <div className="env-metric-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <Shovel size={20} />
              </div>
              <div className="env-metric-content">
                <div className="env-metric-label">Soil Reading</div>
                <div className="env-metric-value">
                  {isConnected && soilRaw !== null && soilRaw !== undefined
                    ? `${soilRaw}`
                    : 'Unavailable'}
                </div>
                <div className="env-metric-meta">Analog ADC substrate sensor ({soilStatus})</div>
              </div>
            </div>

            {/* Tank Distance */}
            <div className="env-metric-item">
              <div className="env-metric-icon" style={{ background: '#f8fafc', color: '#475569' }}>
                <Ruler size={20} />
              </div>
              <div className="env-metric-content">
                <div className="env-metric-label">Tank Distance</div>
                <div className="env-metric-value">
                  {isConnected && tankDistanceCm !== null && tankDistanceCm !== undefined
                    ? `${tankDistanceCm.toFixed(1)} cm`
                    : 'Unavailable'}
                </div>
                <div className="env-metric-meta">Ultrasonic distance to water surface</div>
              </div>
            </div>

            {/* Tank Level */}
            <div className="env-metric-item">
              <div className="env-metric-icon" style={{ background: '#eff6ff', color: '#0284c7' }}>
                <Waves size={20} />
              </div>
              <div className="env-metric-content">
                <div className="env-metric-label">Tank Level</div>
                <div className="env-metric-value">
                  {isConnected && tankPercent !== null && tankPercent !== undefined
                    ? `${tankPercent} %`
                    : 'Unavailable'}
                </div>
                <div className="env-metric-meta">Calculated reservoir fullness capacity</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
