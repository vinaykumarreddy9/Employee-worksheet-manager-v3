import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Share2 } from 'lucide-react';
import './Layout.css';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-branding">
        <div className="sidebar-logo-circle">
          <Share2 size={32} strokeWidth={2.5} />
        </div>
        <div className="company-name">Digiotai Solutions</div>
      </div>

      <div className="profile-card">
        <div className="profile-field">
          <div className="profile-label">FULL NAME</div>
          <div className="profile-value">{user.name}</div>
        </div>
        <div className="profile-field">
          <div className="profile-label">EMPLOYEE ID</div>
          <div className="profile-value">{user.employee_id}</div>
        </div>
        <div className="profile-field">
          <div className="profile-label">EMAIL ADDRESS</div>
          <div className="profile-value" title={user.email}>
            {user.email.length > 23 ? `${user.email.substring(0, 23)}...` : user.email}
          </div>
        </div>
        <div className="profile-field">
          <div className="profile-label">ROLE</div>
          <div className="profile-value">{user.role}</div>
        </div>
      </div>

      <div className="logout-container">
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export const Layout = ({ children }) => {
  return (
    <div className="main-layout">
      <Sidebar />
      <main className="content-area">
        {children}
      </main>
    </div>
  );
};
