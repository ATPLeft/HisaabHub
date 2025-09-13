import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();
  
  async function submit(e) { 
    e.preventDefault(); 
    
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    
    try { 
      setLoading(true);
      setError('');
      const r = await api.auth.login(form); 
      localStorage.setItem('token', r.data.token); 
      localStorage.setItem('name', r.data.user.name); 
      localStorage.setItem('userId', r.data.user.id);
      onLogin();
      nav('/dashboard'); 
    } catch (err) { 
      setError(err?.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="container">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your HisaabHub account</p>
          </div>
          
          {error && <div className="error">{error}</div>}
          
          <form onSubmit={submit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                id="email"
                className="input" 
                type="email"
                placeholder="Enter your email" 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                className="input" 
                placeholder="Enter your password" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})} 
              />
            </div>
            
            <button 
              className="button button-full" 
              type="submit"
              disabled={loading || !form.email || !form.password}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/signup" className="auth-link">
                Sign up here
              </Link>
            </p>
            <p>
              <Link to="/" className="auth-link">
                ← Back to Home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}