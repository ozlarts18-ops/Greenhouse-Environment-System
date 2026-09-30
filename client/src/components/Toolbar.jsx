import React from 'react';
import { Search, Plus, Filter, ArrowUpDown } from 'lucide-react';

export default function Toolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories = [],
  sortBy,
  onSortByChange,
  order,
  onToggleOrder,
  onOpenCreateModal,
}) {
  return (
    <div className="toolbar">
      <div className="search-box">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          className="search-input"
          placeholder="Search by title, description, or tag..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filters-group">
        <select
          className="select-input"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          aria-label="Filter by Status"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <select
          className="select-input"
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value)}
          aria-label="Filter by Priority"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {categories.length > 0 && (
          <select
            className="select-input"
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            aria-label="Filter by Category"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}

        <select
          className="select-input"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          aria-label="Sort Tasks"
        >
          <option value="createdAt">Date Created</option>
          <option value="dueDate">Due Date</option>
          <option value="title">Title (A-Z)</option>
          <option value="priority">Priority</option>
        </select>

        <button
          className="btn btn-secondary"
          onClick={onToggleOrder}
          title={`Currently ${order.toUpperCase()}. Click to switch order.`}
        >
          <ArrowUpDown size={15} />
          <span>{order.toUpperCase()}</span>
        </button>

        <button className="btn btn-primary" onClick={onOpenCreateModal}>
          <Plus size={18} />
          <span>Create Task</span>
        </button>
      </div>
    </div>
  );
}
