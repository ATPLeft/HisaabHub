import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

export default function Navbar({ isAuthenticated, onLogout }) {
  const nav = useNavigate();
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('name');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('userId');
    onLogout();
    nav('/');
  };

  return (
    <div className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          💰 HisaabHub
        </Link>
        
        <div className="nav-links">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <span className="nav-welcome">Hi, {name || 'User'}</span>
              <button className="nav-button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="nav-button">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}