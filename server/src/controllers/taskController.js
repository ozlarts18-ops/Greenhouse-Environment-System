const mongoose = require('mongoose');
const Task = require('../models/Task');

// In-memory mock store used transparently as fallback if MongoDB is not connected yet
let mockTasks = [
  {
    _id: 'mock-1',
    title: 'Welcome to your MERN Stack Application!',
    description: 'This is a sample task stored in the system. You can create, edit, filter, and delete tasks.',
    status: 'in-progress',
    priority: 'high',
    category: 'MERN Setup',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    tags: ['react', 'node', 'express', 'mongodb'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'mock-2',
    title: 'Configure MongoDB Connection',
    description: 'Set your MONGODB_URI in server/.env (e.g. MongoDB Atlas or local mongodb://127.0.0.1:27017/mern_project_db).',
    status: 'pending',
    priority: 'urgent',
    category: 'Database',
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString(),
    tags: ['mongodb', 'config'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'mock-3',
    title: 'Build modern React frontend features',
    description: 'Customize the Vite + React client with custom components and styles.',
    status: 'completed',
    priority: 'medium',
    category: 'Frontend',
    dueDate: new Date().toISOString(),
    tags: ['frontend', 'vite', 'css'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const isDbReady = () => mongoose.connection.readyState === 1;

// @desc    Get all tasks with filtering, searching, and sorting
// @route   GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const { status, priority, category, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    if (!isDbReady()) {
      let filtered = [...mockTasks];

      if (status && status !== 'all') {
        filtered = filtered.filter((t) => t.status === status);
      }
      if (priority && priority !== 'all') {
        filtered = filtered.filter((t) => t.priority === priority);
      }
      if (category && category !== 'all') {
        filtered = filtered.filter((t) => t.category.toLowerCase() === category.toLowerCase());
      }
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query) ||
            (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(query)))
        );
      }

      filtered.sort((a, b) => {
        const valA = a[sortBy] || '';
        const valB = b[sortBy] || '';
        if (order === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });

      return res.status(200).json({
        success: true,
        count: filtered.length,
        isMock: true,
        data: filtered,
      });
    }

    // MongoDB connected
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (category && category !== 'all') query.category = new RegExp(`^${category}$`, 'i');
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const sortDirection = order === 'asc' ? 1 : -1;
    const tasks = await Task.find(query).sort({ [sortBy]: sortDirection });

    res.status(200).json({
      success: true,
      count: tasks.length,
      isMock: false,
      data: tasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, message: 'Server error fetching tasks', error: error.message });
  }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats
exports.getTaskStats = async (req, res) => {
  try {
    if (!isDbReady()) {
      const total = mockTasks.length;
      const completed = mockTasks.filter((t) => t.status === 'completed').length;
      const inProgress = mockTasks.filter((t) => t.status === 'in-progress').length;
      const pending = mockTasks.filter((t) => t.status === 'pending').length;
      const urgent = mockTasks.filter((t) => t.priority === 'urgent').length;

      return res.status(200).json({
        success: true,
        isMock: true,
        data: { total, completed, inProgress, pending, urgent },
      });
    }

    const [total, completed, inProgress, pending, urgent] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'in-progress' }),
      Task.countDocuments({ status: 'pending' }),
      Task.countDocuments({ priority: 'urgent' }),
    ]);

    res.status(200).json({
      success: true,
      isMock: false,
      data: { total, completed, inProgress, pending, urgent },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching stats', error: error.message });
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isDbReady()) {
      const task = mockTasks.find((t) => t._id === id);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      return res.status(200).json({ success: true, isMock: true, data: task });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    res.status(200).json({ success: true, isMock: false, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title, description, status, priority, category, dueDate, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    if (!isDbReady()) {
      const newTask = {
        _id: 'task-' + Date.now(),
        title: title.trim(),
        description: description ? description.trim() : '',
        status: status || 'pending',
        priority: priority || 'medium',
        category: category ? category.trim() : 'General',
        dueDate: dueDate || null,
        tags: Array.isArray(tags) ? tags : typeof tags === 'string' && tags ? tags.split(',').map((s) => s.trim()) : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockTasks.unshift(newTask);
      return res.status(201).json({ success: true, isMock: true, data: newTask, message: 'Task created' });
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      category,
      dueDate,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' && tags ? tags.split(',').map((s) => s.trim()) : [],
    });

    res.status(201).json({ success: true, isMock: false, data: task, message: 'Task created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update an existing task
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map((s) => s.trim()).filter(Boolean);
    }

    if (!isDbReady()) {
      const index = mockTasks.findIndex((t) => t._id === id);
      if (index === -1) return res.status(404).json({ success: false, message: 'Task not found' });

      mockTasks[index] = {
        ...mockTasks[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      return res.status(200).json({
        success: true,
        isMock: true,
        data: mockTasks[index],
        message: 'Task updated',
      });
    }

    const task = await Task.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    res.status(200).json({ success: true, isMock: false, data: task, message: 'Task updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isDbReady()) {
      const initialLen = mockTasks.length;
      mockTasks = mockTasks.filter((t) => t._id !== id);
      if (mockTasks.length === initialLen) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      return res.status(200).json({ success: true, isMock: true, message: 'Task deleted successfully' });
    }

    const task = await Task.findByIdAndDelete(id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    res.status(200).json({ success: true, isMock: false, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
