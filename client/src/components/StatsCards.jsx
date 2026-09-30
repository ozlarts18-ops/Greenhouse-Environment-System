import React from 'react';
import { CheckCircle2, Clock, ListTodo, AlertTriangle, Flame } from 'lucide-react';

export default function StatsCards({ stats = {}, activeStatus, onSelectStatus }) {
  const {
    total = 0,
    completed = 0,
    inProgress = 0,
    pending = 0,
    urgent = 0,
  } = stats;

  const cards = [
    {
      label: 'Total Tasks',
      value: total,
      icon: ListTodo,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.15)',
      statusKey: 'all',
    },
    {
      label: 'In Progress',
      value: inProgress,
      icon: Clock,
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.15)',
      statusKey: 'in-progress',
    },
    {
      label: 'Completed',
      value: completed,
      icon: CheckCircle2,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      statusKey: 'completed',
    },
    {
      label: 'Pending',
      value: pending,
      icon: AlertTriangle,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      statusKey: 'pending',
    },
    {
      label: 'Urgent',
      value: urgent,
      icon: Flame,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      statusKey: 'urgent-filter',
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeStatus === card.statusKey;
        return (
          <div
            key={card.label}
            className="stat-card"
            style={{
              cursor: 'pointer',
              borderColor: isSelected ? card.color : undefined,
            }}
            onClick={() => onSelectStatus(card.statusKey)}
          >
            <div
              className="stat-icon-wrapper"
              style={{ background: card.bg, color: card.color }}
            >
              <Icon size={24} />
            </div>
            <div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
