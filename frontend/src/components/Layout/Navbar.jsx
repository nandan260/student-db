import React from 'react';

export default function Navbar({ user, onRoleChange, activeTitle, onLogout, onToggleMobileMenu }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
        >
          Menu
        </button>
        <h2 className="page-title">{activeTitle || 'Dashboard'}</h2>
      </div>

      <div className="topbar-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Active Role:</label>
          <select
            className="form-select"
            style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
            value={user.role}
            onChange={(e) => onRoleChange(e.target.value)}
          >
            <option value="student">Student (Alex Kumar)</option>
            <option value="faculty">Faculty (Dr. K. V. Sharma)</option>
            <option value="admin">Administrator (Dean Academics)</option>
          </select>
        </div>

        {user && (
          <div className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="user-role-tag">{user.role}</span>
            <span className="user-name">{user.name} ({user.identifier})</span>
          </div>
        )}

        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '5px 10px', fontSize: '12px', marginLeft: '8px' }}
          onClick={onLogout}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
