
const { Pool } = require('pg');

async function setupDatabase() {
  // Use the DATABASE_URL from environment variables
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Setting up database tables...');
    
    // Create tables
    await pool.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Groups table
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Group members table
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id)
      );

      -- Expenses table
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        paid_by INTEGER REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        multiple_payers BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Expense shares table
      CREATE TABLE IF NOT EXISTS expense_shares (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        share_amount DECIMAL(10,2) NOT NULL,
        UNIQUE(expense_id, user_id)
      );

      -- Expense payers table (for multiple payers)
      CREATE TABLE IF NOT EXISTS expense_payers (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        paid_amount DECIMAL(10,2) NOT NULL,
        UNIQUE(expense_id, user_id)
      );

      -- Settlements table
      CREATE TABLE IF NOT EXISTS settlements (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        from_user INTEGER REFERENCES users(id),
        to_user INTEGER REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Payments table
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        from_user INTEGER REFERENCES users(id),
        to_user INTEGER REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        group_id INTEGER REFERENCES groups(id),
        method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Database tables created successfully');
    
    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
      CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
      CREATE INDEX IF NOT EXISTS idx_expense_shares_expense_id ON expense_shares(expense_id);
      CREATE INDEX IF NOT EXISTS idx_expense_shares_user_id ON expense_shares(user_id);
      CREATE INDEX IF NOT EXISTS idx_expense_payers_expense_id ON expense_payers(expense_id);
      CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);
    `);
    
    console.log('Database indexes created successfully');
    
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Export for use in server.js
module.exports = setupDatabase;

// Run if this script is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Database setup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}
