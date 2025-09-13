import React from 'react';
import { Link } from 'react-router-dom';
import './Homepage.css';

export default function Homepage() {
  return (
    <div className="homepage-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Split Expenses Easily with HisaabHub</h1>
            <p className="hero-description">
              The simplest way to manage shared expenses and settle up with friends and family. 
              No more awkward money conversations!
            </p>
            <div className="hero-buttons">
              <Link to="/signup" className="btn btn-primary">
                Get Started Free
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Sign In
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="expense-card">
              <div className="card-header">
                <span>💰 Dinner Party</span>
                <span className="amount">₹2,500</span>
              </div>
              <div className="card-content">
                <div className="split-info">
                  <span>4 people</span>
                  <span>₹625 each</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2>Why Choose HisaabHub?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Quick Setup</h3>
              <p>Create groups and add expenses in seconds. No complicated setup required.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Private</h3>
              <p>Your financial data is encrypted and secure. We never share your information.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile Friendly</h3>
              <p>Works perfectly on all devices. Manage expenses on the go.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💸</div>
              <h3>Multiple Currencies</h3>
              <p>Supports Indian Rupees (₹) with precise calculations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Group Management</h3>
              <p>Add/remove members and manage expenses with admin controls.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Smart Settlements</h3>
              <p>Automatic balance calculations and settlement suggestions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Create a Group</h3>
                <p>Start by creating a group for your friends, family, or roommates.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Add Expenses</h3>
                <p>Record expenses with multiple split options - equal, exact, or percentage.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Track Balances</h3>
                <p>See who owes whom and track all balances in real-time.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Settle Up</h3>
                <p>Record settlements and keep everyone's accounts balanced.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Simplify Your Expense Sharing?</h2>
          <p>Join thousands of users who trust HisaabHub for their shared expenses.</p>
          <div className="cta-buttons">
            <Link to="/signup" className="btn btn-primary btn-large">
              Create Free Account
            </Link>
            <Link to="/login" className="btn btn-secondary btn-large">
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>HisaabHub</h3>
              <p>Making expense sharing simple and fair for everyone.</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#pricing">Pricing</a>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <a href="#about">About</a>
                <a href="#contact">Contact</a>
                <a href="#privacy">Privacy</a>
              </div>
              <div className="footer-column">
                <h4>Support</h4>
                <a href="#help">Help Center</a>
                <a href="#faq">FAQ</a>
                <a href="#community">Community</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 HisaabHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}