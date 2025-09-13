const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const paymentRoutes = require('./routes/payments');
const errorHandler = require('./middleware/errorHandler');
const allowedOrigins = [process.env.CLIENT_URL,'http://localhost:5173'];

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    app: 'HisaabHub',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payments', paymentRoutes);

app.post('/api/setup-database', async (req, res) => {
  try {
    const setupScript = require('./setup-database');
    await setupScript();
    res.json({ message: 'Database setup completed successfully' });
  } catch (error) {
    console.error('Database setup failed:', error);
    res.status(500).json({ error: 'Database setup failed' });
  }
});
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`HisaabHub backend listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});
