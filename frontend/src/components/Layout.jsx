import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';
import logo from '../assets/logo.jpg';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-branding">
        <div className="sidebar-logo">
          <img src={logo} alt="Logo" className="sidebar-img-logo" />
        </div>
        <div className="company-name">Digiotai Solutions</div>
      </div>

      <div className="profile-card">
        <div className="profile-field">
          <div className="profile-label">Full Name</div>
          <div className="profile-value">{user.name}</div>
        </div>
        <div className="profile-field">
          <div className="profile-label">Employee ID</div>
          <div className="profile-value">{user.employee_id}</div>
        </div>
        <div className="profile-field">
          <div className="profile-label">Email Address</div>
          <div className="profile-value" title={user.email}>
            {user.email.length > 23 ? `${user.email.substring(0, 23)}...` : user.email}
          </div>
        </div>
        <div className="profile-field">
          <div className="profile-label">Role</div>
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
