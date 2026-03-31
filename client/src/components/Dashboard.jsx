import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = useCallback(async () => {
    const query = filter ? `status=${filter}` : '';
    const { ok, data } = await api.getTasks(query);
    if (ok) setTasks(data.tasks);
  }, [filter]);

  const loadStats = useCallback(async () => {
    const { ok, data } = await api.getStats();
    if (ok) setStats(data.stats);
  }, []);

  useEffect(() => { loadTasks(); loadStats(); }, [loadTasks, loadStats]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    const body = { ...newTask };
    if (!body.due_date) delete body.due_date;
    if (!body.description) delete body.description;

    const { ok, data } = await api.createTask(body);
    if (ok) {
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowForm(false);
      loadTasks();
      loadStats();
    } else {
      setError(data.message || 'Failed to create task');
    }
  };

  const toggleComplete = async (task) => {
    await api.updateTask(task.id, { completed: !task.completed });
    loadTasks();
    loadStats();
  };

  const handleDelete = async (id) => {
    await api.deleteTask(id);
    loadTasks();
    loadStats();
  };

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header-left">
          <h1>TaskForge</h1>
          <span className="user-badge">{user.role === 'admin' ? '👑 ' : ''}{user.name}</span>
        </div>
        <div className="dash-header-right">
          {user.role === 'admin' && (
            <Link to="/admin" className="btn btn-outline btn-sm">Admin Panel</Link>
          )}
          <button onClick={logout} className="btn btn-ghost btn-sm">Logout</button>
        </div>
      </header>

      {stats && (
        <div className="stats-bar">
          <div className="stat"><span className="stat-num">{stats.total}</span><span className="stat-label">Total</span></div>
          <div className="stat"><span className="stat-num">{stats.active}</span><span className="stat-label">Active</span></div>
          <div className="stat"><span className="stat-num">{stats.completed}</span><span className="stat-label">Done</span></div>
          <div className="stat"><span className="stat-num">{stats.high_priority}</span><span className="stat-label">High Priority</span></div>
          <div className="stat stat-warn"><span className="stat-num">{stats.overdue}</span><span className="stat-label">Overdue</span></div>
        </div>
      )}

      <div className="toolbar">
        <div className="filter-group">
          {['', 'active', 'completed'].map((f) => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
        <form className="task-form" onSubmit={handleCreate}>
          {error && <div className="alert alert-error">{error}</div>}
          <input type="text" placeholder="Task title *" value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} required />
          <input type="text" placeholder="Description (optional)" value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
          <div className="form-row">
            <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input type="date" value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
            <button type="submit" className="btn btn-primary btn-sm">Create</button>
          </div>
        </form>
      )}

      <div className="task-list">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <p>📋</p>
            <p>No tasks {filter ? `with status "${filter}"` : 'yet'}. Create one above!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className={`task-card ${task.completed ? 'completed' : ''} priority-${task.priority}`}>
              <div className="task-left">
                <button className="check-btn" onClick={() => toggleComplete(task)} aria-label="Toggle complete">
                  {task.completed ? '✅' : '⬜'}
                </button>
                <div>
                  <span className="task-title">{task.title}</span>
                  {task.description && <span className="task-desc">{task.description}</span>}
                  <div className="task-meta">
                    <span className={`priority-tag ${task.priority}`}>{task.priority}</span>
                    {task.due_date && <span className="due-date">📅 {new Date(task.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm delete-btn" onClick={() => handleDelete(task.id)} aria-label="Delete task">🗑️</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
