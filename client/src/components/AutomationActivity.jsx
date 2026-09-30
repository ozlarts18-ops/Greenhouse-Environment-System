import React, { useState } from 'react';
import { Activity } from 'lucide-react';

export default function AutomationActivity({ events = [] }) {
  const [filter, setFilter] = useState('ALL');

  const filteredEvents = filter === 'ALL'
    ? events
    : events.filter((e) => e.type?.toUpperCase() === filter);

  const formatTime = (timestamp) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '--:--:--';
    }
  };

  return (
    <section id="activity" className="dashboard-section">
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="section-title">
            <Activity size={22} color="#0f172a" />
            <span>Automation Activity & Event Log</span>
          </h2>
          <p className="section-subtitle">Real-time audit trail of automatic threshold triggers and manual actuator commands</p>
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'AUTOMATION', 'MANUAL', 'SENSOR', 'ERROR'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: '1px solid var(--border-color)',
                background: filter === f ? '#0f172a' : '#ffffff',
                color: filter === f ? '#ffffff' : '#475569',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="clean-card" style={{ padding: '16px' }}>
        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
            No recent activity recorded for selected filter.
          </div>
        ) : (
          <div className="activity-list">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className="activity-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="activity-time">{formatTime(evt.timestamp)}</span>
                  <span className={`activity-badge ${(evt.type || 'sensor').toLowerCase()}`}>
                    {evt.type}
                  </span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{evt.message}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {evt.value && (
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                      {evt.value}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      background: 'var(--bg-subtle)',
                      borderRadius: '4px',
                      color: '#475569',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {evt.component}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
