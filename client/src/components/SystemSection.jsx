import React from 'react';
import { Cpu, CheckCircle, AlertTriangle, ShieldCheck, Globe, Zap } from 'lucide-react';

export default function SystemSection({ systemData = {} }) {
  const {
    hardwareStream = {},
    sensors = {},
    aiServices = {},
    subsystems = [],
    automationRules = [],
    remoteCloudSync = {},
  } = systemData;

  return (
    <section id="system" className="dashboard-section">
      <div className="section-header">
        <h2 className="section-title">
          <span>⚙</span>
          <span>System & Cloud Architecture</span>
        </h2>
        <p className="section-subtitle">
          Agricultural control loops, cloud telemetry relay, and dual AI neural engine diagnostics
        </p>
      </div>

      {/* Connectivity & Health Overview Grid */}
      <div className="cards-grid" style={{ marginBottom: '24px' }}>
        <div className="clean-card">
          <div className="card-label">
            <span>Hardware Cloud Gateway</span>
            <Globe size={16} color="#2563eb" />
          </div>
          <div className="card-value" style={{ fontSize: '1.4rem' }}>
            {hardwareStream.connected ? 'Streaming' : 'Standby / Offline'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            {hardwareStream.status || 'Awaiting Hardware Data'}
          </div>
          <div className={`card-status-badge ${hardwareStream.connected ? 'normal' : 'warning'}`} style={{ marginTop: '10px' }}>
            {hardwareStream.connected ? 'GATEWAY ONLINE' : 'AWAITING HARDWARE'}
          </div>
        </div>

        <div className="clean-card">
          <div className="card-label">
            <span>Dual AI Engine</span>
            <ShieldCheck size={16} color="#16a34a" />
          </div>
          <div className="card-value" style={{ fontSize: '1.4rem' }}>
            {aiServices.connected ? 'Online (Port 8001)' : 'Offline'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            YOLO11s + ResNet-18
          </div>
          <div className={`card-status-badge ${aiServices.connected ? 'normal' : 'error'}`} style={{ marginTop: '10px' }}>
            {aiServices.connected ? 'MODELS READY' : 'AI OFFLINE'}
          </div>
        </div>

        <div className="clean-card" style={{ gridColumn: 'span 2' }}>
          <div className="card-label">
            <span>Sensor Subsystems</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '6px' }}>
            {Object.entries(sensors).map(([key, item]) => (
              <div
                key={key}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-subtle)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                  <span className={`dot ${item.connected ? 'green' : 'amber'}`} style={{ width: 6, height: 6 }} />
                  <span style={{ color: item.connected ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                    {item.connected ? 'Online' : 'Standby'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cloud Remote Access Notice */}
      <div
        style={{
          marginBottom: '24px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '10px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <Globe size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, color: '#14532d', fontSize: '0.88rem' }}>
            Universal Remote Access & Multi-Location Connectivity
          </div>
          <p style={{ fontSize: '0.8rem', color: '#166534', marginTop: '2px', lineHeight: 1.4 }}>
            The Raspberry Pi and greenhouse sensors stream data over the cloud API gateway endpoint (<code>/api/sensors/gateway</code>). You can monitor your greenhouse, receive alerts, and control actuators from any Wi-Fi network, mobile device, or remote location.
          </p>
        </div>
      </div>

      {/* Subsystems & Automation Rules Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Subsystems Table */}
        <div className="clean-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>
            Automated Agricultural Subsystems
          </h3>
          <table className="clean-table">
            <thead>
              <tr>
                <th>Subsystem</th>
                <th>Category</th>
                <th>Functional Scope</th>
              </tr>
            </thead>
            <tbody>
              {subsystems.map((sys, idx) => (
                <tr key={idx}>
                  <td><strong>{sys.name}</strong></td>
                  <td><code>{sys.category}</code></td>
                  <td style={{ color: '#64748b', fontSize: '0.78rem' }}>{sys.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Automation Rules Summary */}
        <div className="clean-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>
            Hysteresis Control Loops & Safety Logic
          </h3>
          <table className="clean-table">
            <thead>
              <tr>
                <th>Subsystem</th>
                <th>Automation Condition</th>
                <th>Benefit</th>
              </tr>
            </thead>
            <tbody>
              {automationRules.map((rule, idx) => (
                <tr key={idx}>
                  <td><strong>{rule.subsystem}</strong></td>
                  <td style={{ color: '#0f172a', fontWeight: 600 }}>{rule.rule}</td>
                  <td style={{ color: '#64748b', fontSize: '0.75rem' }}>{rule.benefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
