const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  console.log('Starting database setup...');
  
  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Add SSL for production (required for Railway)
    ssl: process.env.NODE_ENV === 'production' ? { 
      rejectUnauthorized: false 
    } : false
  });

  let client;
  
  try {
    console.log('Connecting to database...');
    
    // Test connection
    client = await pool.connect();
    console.log('Database connection successful');
    
    // Begin transaction
    await client.query('BEGIN');
    
    console.log('Creating tables...');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created users table');

    // Create groups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created groups table');

    // Create group_members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id)
      );
    `);
    console.log('✓ Created group_members table');

    // Create expenses table
    await client.query(`
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
    `);
    console.log('✓ Created expenses table');

    // Create expense_shares table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_shares (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        share_amount DECIMAL(10,2) NOT NULL,
        UNIQUE(expense_id, user_id)
      );
    `);
    console.log('✓ Created expense_shares table');

    // Create expense_payers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_payers (
        id SERIAL PRIMARY KEY,
        expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        paid_amount DECIMAL(10,2) NOT NULL,
        UNIQUE(expense_id, user_id)
      );
    `);
    console.log('✓ Created expense_payers table');

    // Create settlements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settlements (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        from_user INTEGER REFERENCES users(id),
        to_user INTEGER REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created settlements table');

    // Create payments table
    await client.query(`
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
    console.log('✓ Created payments table');

    // Commit transaction
    await client.query('COMMIT');
    console.log('Database setup completed successfully!');
    
  } catch (error) {
    // Rollback transaction on error
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Database setup failed:', error.message);
    throw error;
  } finally {
    // Release client back to pool
    if (client) client.release();
    await pool.end();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = setupDatabase;