import { Pool } from 'pg';

// Ensure the DATABASE_STRING environment variable is set
if (!process.env.DATABASE_STRING) {
  throw new Error('DATABASE_STRING is not set in environment variables');
}

// Create a single instance of the PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_STRING,
  // You can add other pool configurations here, e.g., max, idleTimeoutMillis
});

// Add an error listener to the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1); // Exit the process if a critical error occurs
});

export default pool;
