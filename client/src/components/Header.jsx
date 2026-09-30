import React from 'react';
import { RefreshCw, User, LogOut, Bell } from 'lucide-react';

export default function Header({
  isConnected,
  lastSync,
  isRefreshing,
  onRefresh,
  currentUser,
  onOpenAuth,
  onLogout,
  activeAlertsCount = 0,
  onScrollToAlerts,
}) {
  const formatTime = (isoString) => {
    if (!isoString) return 'Waiting for hardware...';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <header className="top-header">
      <div className="header-title-block">
        <h1>Smart Greenhouse Automation System</h1>
        <p>Remote Cloud Control & Dual AI Monitoring</p>
      </div>

      <div className="header-actions">
        {/* Alerts quick button */}
        <button
          className="btn btn-secondary"
          onClick={onScrollToAlerts}
          title={`${activeAlertsCount} active alerts`}
          style={{ padding: '6px 12px', fontSize: '0.8rem', position: 'relative' }}
        >
          <Bell size={15} color={activeAlertsCount > 0 ? '#dc2626' : '#475569'} />
          <span>Alerts</span>
          {activeAlertsCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '9999px',
                marginLeft: '4px',
              }}
            >
              {activeAlertsCount}
            </span>
          )}
        </button>

        {/* Hardware online badge */}
        <div className={`status-pill ${isConnected ? 'online' : 'offline'}`}>
          <span className={`dot ${isConnected ? 'green' : 'amber'}`} />
          <span>{isConnected ? 'Hardware Online' : 'Hardware Standby'}</span>
        </div>

        {/* Sync button */}
        <button
          className="btn btn-secondary header-sync-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title={`Last Sync: ${formatTime(lastSync)}`}
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* User Auth Profile */}
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'var(--bg-subtle)',
                borderRadius: '9999px',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <User size={14} color="#0f172a" />
              <span>{currentUser.name || currentUser.email}</span>
            </div>
            <button
              className="btn-icon"
              onClick={onLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onOpenAuth}
            style={{ padding: '7px 14px', fontSize: '0.8rem' }}
          >
            <User size={14} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
