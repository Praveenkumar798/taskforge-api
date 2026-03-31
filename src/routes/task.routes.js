const { Router } = require('express');
const { getTasks, getTask, createTask, updateTask, deleteTask, getStats } = require('../controllers/taskController');
const authenticate = require('../middleware/authenticate');
const { createTaskRules, updateTaskRules, taskIdRule, validate } = require('../middleware/validate');

const router = Router();

// All task routes require authentication
router.use(authenticate);

// Task CRUD
router.get('/stats', getStats);                                    // GET stats (before /:id to avoid conflict)
router.get('/', getTasks);                                         // GET all tasks (with filters)
router.get('/:id', taskIdRule, validate, getTask);                 // GET single task
router.post('/', createTaskRules, validate, createTask);           // CREATE task
router.put('/:id', updateTaskRules, validate, updateTask);         // UPDATE task
router.delete('/:id', taskIdRule, validate, deleteTask);           // DELETE task

module.exports = router;
