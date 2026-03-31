const { query } = require('../config/db');

/**
 * GET /api/admin/users
 * List all users (admin only). Excludes password hashes.
 */
const getAllUsers = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, created_at, updated_at,
        (SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id) AS task_count
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({
      count: result.rows.length,
      users: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/users/:id
 * Get a single user's details with their tasks (admin only).
 */
const getUser = async (req, res, next) => {
  try {
    const userResult = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tasksResult = await query(
      'SELECT id, title, priority, completed, created_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      user: userResult.rows[0],
      tasks: tasksResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete a user account (admin only). Cannot delete self.
 */
const deleteUser = async (req, res, next) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete self',
        message: 'You cannot delete your own admin account.',
      });
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully',
      deleted: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/role
 * Change a user's role (admin only).
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be "user" or "admin".',
      });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot change own role',
        message: 'You cannot change your own role.',
      });
    }

    const result = await query(
      `UPDATE users SET role = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, name, email, role`,
      [role, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllUsers, getUser, deleteUser, updateUserRole };
