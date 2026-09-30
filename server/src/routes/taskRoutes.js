const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

// Routes for /api/tasks
router.route('/').get(getTasks).post(createTask);
router.route('/stats').get(getTaskStats);
router.route('/:id').get(getTaskById).put(updateTask).delete(deleteTask);

module.exports = router;
