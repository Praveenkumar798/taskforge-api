import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function AdminPanel() {
  const { logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    const { ok, data } = await api.getUsers();
    if (ok) setUsers(data.users);
    else setError(data.message || 'Failed to load users');
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    const { ok, data } = await api.updateUserRole(userId, newRole);
    if (ok) loadUsers();
    else setError(data.message || 'Failed to update role');
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    const { ok, data } = await api.deleteUser(userId);
    if (ok) loadUsers();
    else setError(data.message || 'Failed to delete user');
  };

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header-left">
          <h1>Admin Panel</h1>
          <span className="user-badge">👑 Administrator</span>
        </div>
        <div className="dash-header-right">
          <Link to="/dashboard" className="btn btn-outline btn-sm">← Dashboard</Link>
          <button onClick={logout} className="btn btn-ghost btn-sm">Logout</button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-stats">
        <div className="stat"><span className="stat-num">{users.length}</span><span className="stat-label">Total Users</span></div>
        <div className="stat"><span className="stat-num">{users.filter(u => u.role === 'admin').length}</span><span className="stat-label">Admins</span></div>
        <div className="stat"><span className="stat-num">{users.reduce((s, u) => s + parseInt(u.task_count || 0), 0)}</span><span className="stat-label">Total Tasks</span></div>
      </div>

      <div className="user-table-wrap">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Tasks</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="user-name">{u.name}</td>
                <td className="user-email">{u.email}</td>
                <td>
                  <span className={`role-badge ${u.role}`}>{u.role}</span>
                </td>
                <td>{u.task_count}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="user-actions">
                  <button
                    className="btn btn-outline btn-xs"
                    onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}
                    title={`Change to ${u.role === 'admin' ? 'user' : 'admin'}`}
                  >
                    {u.role === 'admin' ? '↓ Demote' : '↑ Promote'}
                  </button>
                  <button className="btn btn-danger btn-xs" onClick={() => handleDelete(u.id)} title="Delete user">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
