import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' }); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();
  
  async function submit(e) { 
    e.preventDefault(); 
    
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try { 
      setLoading(true);
      setError('');
      await api.auth.signup(form); 
      alert('Signup successful! Please login with your credentials.'); 
      nav('/login'); 
    } catch (err) { 
      setError(err?.response?.data?.error || 'Signup failed. Please try again.'); 
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="container">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Create Account</h2>
            <p>Join HisaabHub to start managing your expenses</p>
          </div>
          
          {error && <div className="error">{error}</div>}
          
          <form onSubmit={submit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input 
                id="name"
                className="input" 
                placeholder="Enter your full name" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
              />
            </div>
            
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
                placeholder="Create a password (min 6 characters)" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})} 
              />
            </div>
            
            <button 
              className="button button-full" 
              type="submit"
              disabled={loading || !form.name || !form.email || form.password.length < 6}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
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