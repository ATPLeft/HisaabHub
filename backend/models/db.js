const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
<<<<<<< HEAD
  // Add SSL for production
=======
  // Add SSL for production - essential for Railway
>>>>>>> 0778ca8524253de51a78913679b8e9af1922de63
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false
});

<<<<<<< HEAD
// Test connection on startup
=======
// Test connection
>>>>>>> 0778ca8524253de51a78913679b8e9af1922de63
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
<<<<<<< HEAD
  process.exit(-1);
=======
>>>>>>> 0778ca8524253de51a78913679b8e9af1922de63
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
