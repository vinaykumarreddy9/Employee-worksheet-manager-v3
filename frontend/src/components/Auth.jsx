import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';
import logo from '../assets/logo.jpg';

export const Login = ({ onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please enter your credentials.');
      return;
    }
    try {
      await login(email, password);
    } catch {
      // Error is handled by context
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo">
          <img src={logo} alt="DIGIOTAI SOLUTIONS" className="main-logo" />
        </div>
        <h1>Timesheet Manager</h1>
        <p>Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            placeholder="john@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        {(localError || error) && <div className="error-message">{localError || error}</div>}
        
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div className="auth-footer">
        <button className="text-btn" onClick={onSwitch}>
          Don't have an account? Sign Up
        </button>
      </div>
    </div>
  );
};

export const Signup = ({ onSwitch }) => {
  const [formData, setFormData] = useState({
    name: '',
    employee_id: '',
    email: '',
    password: '',
    role: 'Employee'
  });
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signup, loading, error } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.employee_id || !formData.email || !formData.password) {
      setLocalError('Please fill in all fields.');
      return;
    }
    try {
      await signup(formData);
      setSuccess(true);
      setTimeout(() => onSwitch(), 2000);
    } catch {
      // Error handled by context
    }
  };

  if (success) {
    return (
      <div className="auth-card">
        <div className="success-screen">
          <div className="success-icon">✅</div>
          <h2>Account Created!</h2>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo">
          <img src={logo} alt="DIGIOTAI SOLUTIONS" className="main-logo" />
        </div>
        <h1>Create Account</h1>
        <p>Join the Timesheet Management System</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Full Name</label>
          <input name="name" placeholder="John Doe" value={formData.name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Employee ID</label>
          <input name="employee_id" placeholder="EMP001" value={formData.employee_id} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input name="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>I am an</label>
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="Employee">Employee</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        {(localError || error) && <div className="error-message">{localError || error}</div>}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-footer">
        <button className="text-btn" onClick={onSwitch}>
          Already have an account? Log In
        </button>
      </div>
    </div>
  );
};
