import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local dev reads .env; in containers there is none and the process env is used as-is.
const envFile = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
} else {
  console.log(`No .env file at ${envFile}; using the process environment.`);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_STRING,
});

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));

    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      console.log(`Running migration: ${file}`);
      // ponytail: file + bookkeeping are two statements, not one transaction —
      // 019 uses CREATE INDEX CONCURRENTLY, which refuses to run inside a transaction block.
      await client.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    }
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Error running migrations', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
