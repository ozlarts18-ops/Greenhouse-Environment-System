import React from 'react';
import {
  Home,
  Activity,
  Sliders,
  BarChart3,
  Bell,
  Sprout,
  Bug,
  Cpu,
} from 'lucide-react';

export default function Sidebar({ activeSection, onSelectSection, activeAlertsCount = 0 }) {
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'environment', label: 'Live Environment', icon: Activity },
    { id: 'controls', label: 'Controls', icon: Sliders },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'crop-ai', label: 'Crop Monitoring AI', icon: Sprout },
    { id: 'pest-ai', label: 'Pest Monitoring AI', icon: Bug },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: activeAlertsCount },
    { id: 'system', label: 'System', icon: Cpu },
  ];

  const handleScroll = (id) => {
    onSelectSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <aside className="iotrex-sidebar">
      <div>
        <div className="sidebar-header">
          <div className="brand-title">
            <span style={{ color: '#16a34a' }}>🌿</span>
            <span style={{ fontSize: '1.02rem', lineHeight: 1.25 }}>Smart Greenhouse</span>
          </div>
          <div className="brand-subtitle">Automation System</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleScroll(item.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: isActive ? '#0f172a' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '9999px',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div>Smart Greenhouse Automation</div>
        <div style={{ marginTop: '2px', color: '#64748b' }}>Dual AI • Cloud Control</div>
      </div>
    </aside>
  );
}
