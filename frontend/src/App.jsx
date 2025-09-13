import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Group from './pages/Group';
import Navbar from './components/Navbar';
import Homepage from './pages/Homepage';

function Private({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function Public({ children }) {
  const token = localStorage.getItem('token');
  return !token ? children : <Navigate to="/dashboard" />;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={
          <Public>
            <Homepage />
          </Public>
        } />
        <Route path="/login" element={
          <Public>
            <Login onLogin={handleLogin} />
          </Public>
        } />
        <Route path="/signup" element={
          <Public>
            <Signup />
          </Public>
        } />
        <Route path="/dashboard" element={
          <Private>
            <Dashboard />
          </Private>
        } />
        <Route path="/group/:id" element={
          <Private>
            <Group />
          </Private>
        } />
      </Routes>
    </BrowserRouter>
  );
}