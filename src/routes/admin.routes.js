const { Router } = require('express');
const { getAllUsers, getUser, deleteUser, updateUserRole } = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { userIdRule, validate } = require('../middleware/validate');

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(authorize('admin'));

// User management
router.get('/users', getAllUsers);                                       // List all users
router.get('/users/:id', userIdRule, validate, getUser);                 // Get user details
router.delete('/users/:id', userIdRule, validate, deleteUser);           // Delete user
router.patch('/users/:id/role', userIdRule, validate, updateUserRole);   // Change user role

module.exports = router;
