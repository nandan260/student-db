import React from 'react';

export default function Navbar({ user, activeTitle }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="page-title">{activeTitle || 'Dashboard'}</h2>
      </div>

      <div className="topbar-right">
        {user && (
          <div className="user-badge">
            <span className="user-role-tag">{user.role}</span>
            <span className="user-name">{user.name} ({user.identifier})</span>
          </div>
        )}
      </div>
    </header>
  );
}
