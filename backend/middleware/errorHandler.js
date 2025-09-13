function errorHandler(err, req, res, next) {
  console.error(err.stack);

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({ error: 'A record with these details already exists.' });
  }
  
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({ error: 'Related record not found.' });
  }
  
  if (err.code === '23502') { // Not null violation
    return res.status(400).json({ error: 'Required field missing.' });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token.' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired.' });
  }
  
  // Default error
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message 
  });
}

module.exports = errorHandler;