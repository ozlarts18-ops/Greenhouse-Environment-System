import React from 'react';
import {
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  Tag,
  Edit2,
  Trash2,
  Folder,
} from 'lucide-react';

export default function TaskCard({ task, onToggleStatus, onEdit, onDelete }) {
  const isCompleted = task.status === 'completed';

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formattedDueDate = formatDate(task.dueDate);

  return (
    <div className={`task-card priority-${task.priority || 'medium'}`}>
      <div>
        <div className="task-header">
          <div className="task-title-group">
            <button
              className={`status-toggle ${isCompleted ? 'completed' : ''}`}
              onClick={() => onToggleStatus(task)}
              title={isCompleted ? 'Mark as In Progress' : 'Mark as Completed'}
              aria-label="Toggle task status"
            >
              {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
            </button>
            <h3 className={`task-title ${isCompleted ? 'completed' : ''}`}>
              {task.title}
            </h3>
          </div>
        </div>

        {task.description && <p className="task-desc">{task.description}</p>}

        <div className="task-meta">
          <span className={`badge badge-${task.status}`}>
            {task.status.replace('-', ' ')}
          </span>
          <span className={`badge badge-${task.priority}`}>
            {task.priority}
          </span>
          {task.category && (
            <span className="category-chip">
              <Folder size={12} />
              {task.category}
            </span>
          )}
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="tags-list">
            {task.tags.map((tag, idx) => (
              <span key={idx} className="tag-item">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="task-footer">
        <div className="task-date">
          {formattedDueDate ? (
            <>
              <Calendar size={13} />
              <span>Due {formattedDueDate}</span>
            </>
          ) : (
            <>
              <Clock size={13} />
              <span>{formatDate(task.createdAt) || 'Recent'}</span>
            </>
          )}
        </div>

        <div className="task-actions">
          <button
            className="btn-icon"
            onClick={() => onEdit(task)}
            title="Edit Task"
            aria-label="Edit Task"
          >
            <Edit2 size={15} />
          </button>
          <button
            className="btn-icon delete"
            onClick={() => onDelete(task)}
            title="Delete Task"
            aria-label="Delete Task"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
