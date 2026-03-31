const { query } = require('../config/db');

/**
 * GET /api/tasks
 * Get all tasks for the authenticated user.
 * Supports query params: ?status=active|completed&priority=high|medium|low&sort=created_at|due_date|priority
 */
const getTasks = async (req, res, next) => {
  try {
    const { status, priority, sort = 'created_at', order = 'desc' } = req.query;

    let sql = 'SELECT * FROM tasks WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    // Filter by completion status
    if (status === 'active') {
      sql += ` AND completed = false`;
    } else if (status === 'completed') {
      sql += ` AND completed = true`;
    }

    // Filter by priority
    if (['high', 'medium', 'low'].includes(priority)) {
      sql += ` AND priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    // Sort (whitelist allowed columns to prevent SQL injection)
    const allowedSorts = ['created_at', 'due_date', 'priority', 'title', 'completed'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortCol} ${sortOrder}`;

    const result = await query(sql, params);

    res.json({
      count: result.rows.length,
      tasks: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tasks/:id
 * Get a single task by ID (owner only).
 */
const getTask = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'Task does not exist or you do not have access to it.',
      });
    }

    res.json({ task: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tasks
 * Create a new task for the authenticated user.
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, priority, due_date } = req.body;

    const result = await query(
      `INSERT INTO tasks (user_id, title, description, priority, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, title, description || null, priority || 'medium', due_date || null]
    );

    res.status(201).json({
      message: 'Task created successfully',
      task: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/tasks/:id
 * Update a task (owner only). Supports partial updates.
 */
const updateTask = async (req, res, next) => {
  try {
    // Verify ownership
    const existing = await query(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'Task does not exist or you do not have access to it.',
      });
    }

    // Build dynamic update query (only update provided fields)
    const allowedFields = ['title', 'description', 'priority', 'due_date', 'completed'];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(req.body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'Please provide at least one field to update.',
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);
    values.push(req.user.id);

    const sql = `UPDATE tasks SET ${updates.join(', ')}
                 WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
                 RETURNING *`;

    const result = await query(sql, values);

    res.json({
      message: 'Task updated successfully',
      task: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/tasks/:id
 * Delete a task (owner only).
 */
const deleteTask = async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'Task does not exist or you do not have access to it.',
      });
    }

    res.json({ message: 'Task deleted successfully', id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tasks/stats
 * Get task statistics for the authenticated user.
 */
const getStats = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE completed = false) AS active,
        COUNT(*) FILTER (WHERE completed = true) AS completed,
        COUNT(*) FILTER (WHERE priority = 'high' AND completed = false) AS high_priority,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND completed = false) AS overdue
       FROM tasks WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({ stats: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, getStats };
