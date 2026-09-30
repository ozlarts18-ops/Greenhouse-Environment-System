import React, { useState } from 'react';
import { Lightbulb, Cog, Droplet, Wind, Loader2 } from 'lucide-react';

export default function DeviceControls({ devices = [], onUpdateDevice, isUpdating }) {
  const [pendingDevice, setPendingDevice] = useState(null);

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'GROW_LIGHT':
        return <Lightbulb size={22} color="#ca8a04" />;
      case 'TANK_MOTOR':
        return <Cog size={22} color="#2563eb" />;
      case 'SOIL_PUMP':
        return <Droplet size={22} color="#16a34a" />;
      case 'FAN':
        return <Wind size={22} color="#0891b2" />;
      default:
        return <Cog size={22} />;
    }
  };

  const handleCommand = async (deviceType, mode, state) => {
    setPendingDevice(deviceType);
    try {
      await onUpdateDevice(deviceType, { mode, state });
    } finally {
      setTimeout(() => setPendingDevice(null), 800);
    }
  };

  return (
    <section id="controls" className="dashboard-section">
      <div className="section-header">
        <h2 className="section-title">
          <span>🎛</span>
          <span>Actuator Controls</span>
        </h2>
        <p className="section-subtitle">
          Command greenhouse actuators remotely or enable automated environmental control loops
        </p>
      </div>

      <div className="actuator-list">
        {devices.map((device) => {
          const isAuto = device.mode === 'AUTO';
          const isOn = device.state === 'ON';
          const isOff = device.state === 'OFF';
          const isThisPending = isUpdating && pendingDevice === device.type;

          return (
            <div key={device.type} className="actuator-row-card">
              {/* LEFT: Actuator Icon & Full Name */}
              <div className="actuator-col-info">
                <div className="actuator-icon-box">
                  {getDeviceIcon(device.type)}
                </div>
                <div className="actuator-name-group">
                  <h3 className="actuator-name">{device.name}</h3>
                  <div className="actuator-subsystem-tag">
                    Subsystem: <strong>{device.type.replace('_', ' ')}</strong>
                  </div>
                </div>
              </div>

              {/* CENTER: Live Status, Mode & Automation Condition */}
              <div className="actuator-col-status">
                <div className="actuator-badges-row">
                  <span className={`actuator-state-pill ${isOn ? 'on' : 'off'}`}>
                    <span className={`pill-dot ${isOn ? 'green' : 'gray'}`} />
                    <span>{isThisPending ? 'SENDING...' : device.state}</span>
                  </span>

                  <span className={`actuator-mode-pill ${isAuto ? 'auto' : 'manual'}`}>
                    <span>Mode: <strong>{device.mode}</strong></span>
                  </span>

                  <span className="actuator-pending-slot">
                    {isThisPending && (
                      <span className="pending-msg">
                        <Loader2 size={12} className="spin" />
                        <span>Sending...</span>
                      </span>
                    )}
                  </span>
                </div>

                <div className="actuator-rule-text">
                  <span className="rule-label">Automation Loop:</span> {device.rule || 'Auto control active'}
                </div>

                {device.type === 'SOIL_PUMP' && device.wateringRemaining > 0 && (
                  <div className="actuator-active-note active-watering">
                    Watering active: {device.wateringRemaining}s remaining
                  </div>
                )}

                {device.type === 'SOIL_PUMP' && device.cooldownRemaining > 0 && (
                  <div className="actuator-active-note active-cooldown">
                    Cooldown active: {device.cooldownRemaining}s remaining before next cycle
                  </div>
                )}
              </div>

              {/* RIGHT: [ ON ] [ OFF ] [ AUTO ] Controls */}
              <div className="actuator-col-actions">
                <div className="actuator-btn-group">
                  <button
                    type="button"
                    className={`actuator-action-btn on-btn ${!isAuto && isOn ? 'active' : ''}`}
                    onClick={() => handleCommand(device.type, 'MANUAL', 'ON')}
                    disabled={isUpdating}
                    title="Turn actuator ON (Manual Mode)"
                  >
                    <span>ON</span>
                    <span className={`btn-dot ${!isAuto && isOn ? 'visible' : ''}`}>●</span>
                  </button>

                  <button
                    type="button"
                    className={`actuator-action-btn off-btn ${!isAuto && isOff ? 'active' : ''}`}
                    onClick={() => handleCommand(device.type, 'MANUAL', 'OFF')}
                    disabled={isUpdating}
                    title="Turn actuator OFF (Manual Mode)"
                  >
                    <span>OFF</span>
                    <span className={`btn-dot ${!isAuto && isOff ? 'visible' : ''}`}>●</span>
                  </button>

                  <button
                    type="button"
                    className={`actuator-action-btn auto-btn ${isAuto ? 'active' : ''}`}
                    onClick={() => handleCommand(device.type, 'AUTO', null)}
                    disabled={isUpdating}
                    title="Resume automated greenhouse logic"
                  >
                    <span>AUTO</span>
                    <span className={`btn-dot ${isAuto ? 'visible' : ''}`}>●</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
