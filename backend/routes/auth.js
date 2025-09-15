const express = require('express');
const router = express.Router();
const db = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validateSignup, validateLogin } = require('../middleware/validation');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

router.post('/signup', validateSignup, async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    // Check if user already exists
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    // Create user
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hash]
    );
    
    const user = result.rows[0];
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
    
  } catch (err) {
    console.error('Signup error:', err);
    
    // Specific error handling for database issues
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection failed. Please try again later.' });
    }
    
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

router.post('/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user
    const result = await db.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
    
  } catch (err) {
    console.error('Login error:', err);
    
    // Specific error handling for database issues
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database connection failed. Please try again later.' });
    }
    
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

module.exports = router;