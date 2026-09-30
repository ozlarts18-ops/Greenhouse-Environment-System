import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { resolveAlert } from '../services/api';

export default function AlertsSection({ alerts = [], onAlertsUpdated }) {
  const [filter, setFilter] = useState('ALL');
  const [isResolving, setIsResolving] = useState(false);

  const filteredAlerts = filter === 'ALL'
    ? alerts
    : alerts.filter((a) => a.severity === filter);

  const handleResolve = async (alertId) => {
    try {
      setIsResolving(true);
      await resolveAlert(alertId);
      if (onAlertsUpdated) onAlertsUpdated();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (' + d.toLocaleDateString() + ')';
    } catch {
      return 'Recent';
    }
  };

  return (
    <section id="alerts" className="dashboard-section">
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 className="section-title">
            <ShieldAlert size={22} color="#dc2626" />
            <span>Live Alerts & Notifications</span>
          </h2>
          <p className="section-subtitle">Real-time agricultural safety warnings, critical water levels, and automated pest alerts</p>
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((f) => (
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

      <div className="clean-card" style={{ padding: '20px' }}>
        {filteredAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#16a34a' }}>
            <CheckCircle2 size={36} style={{ margin: '0 auto 8px', color: '#16a34a' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Greenhouse Status Normal</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              No unresolved alerts detected for the selected filter.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredAlerts.map((alt) => {
              const isCrit = alt.severity === 'CRITICAL';
              const isWarn = alt.severity === 'WARNING';
              const borderCol = isCrit ? '#fecaca' : isWarn ? '#fde68a' : '#bfdbfe';
              const bgCol = isCrit ? '#fef2f2' : isWarn ? '#fffbeb' : '#eff6ff';
              const textCol = isCrit ? '#991b1b' : isWarn ? '#92400e' : '#1e40af';

              return (
                <div
                  key={alt.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    background: bgCol,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                    opacity: alt.resolved ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {isCrit ? (
                      <AlertCircle size={20} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                    ) : isWarn ? (
                      <AlertTriangle size={20} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                    ) : (
                      <Info size={20} color="#2563eb" style={{ marginTop: '2px', flexShrink: 0 }} />
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: textCol, fontSize: '0.9rem' }}>
                          {alt.title}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#ffffff',
                            color: textCol,
                            border: `1px solid ${borderCol}`,
                          }}
                        >
                          {alt.severity}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Source: <strong>{alt.component}</strong>
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#334155', marginTop: '4px' }}>
                        {alt.message}
                      </p>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                        Timestamp: {formatTime(alt.timestamp)}
                      </div>
                    </div>
                  </div>

                  <div>
                    {!alt.resolved ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleResolve(alt.id)}
                        disabled={isResolving}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#ffffff' }}
                      >
                        Resolve
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                        ✓ Resolved
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
