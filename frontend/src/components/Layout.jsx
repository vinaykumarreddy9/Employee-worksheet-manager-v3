import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';
import { LogOut, User, Hash, Mail, Shield } from 'lucide-react';
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
        <div className="company-name">DIGIOTAI SOLUTIONS</div>
      </div>

      <div className="profile-card">
        <div className="profile-field">
          <div className="profile-label">Full Name</div>
          <div className="profile-value">
            <User size={14} /> {user.name}
          </div>
        </div>
        <div className="profile-field">
          <div className="profile-label">Employee ID</div>
          <div className="profile-value">
            <Hash size={14} /> {user.employee_id}
          </div>
        </div>
        <div className="profile-field">
          <div className="profile-label">Email Address</div>
          <div className="profile-value">
            <Mail size={14} /> {user.email}
          </div>
        </div>
        <div className="profile-field">
          <div className="profile-label">Role</div>
          <div className="profile-value">
            <Shield size={14} /> {user.role}
          </div>
        </div>
      </div>

      <button className="logout-btn" onClick={logout}>
        <LogOut size={18} /> Logout
      </button>
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
