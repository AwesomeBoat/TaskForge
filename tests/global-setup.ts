import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

/** Brings the dedicated test database up to the current schema once per run. */
export default async function globalSetup(): Promise<void> {
  try {
    process.loadEnvFile('.env');
  } catch {
    // CI may provide the variables directly.
  }

  const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL is not set — see .env.example.');
  }
  if (connectionString === process.env.DATABASE_URL && !connectionString.includes('test')) {
    throw new Error('Refusing to run tests against a non-test database. Set TEST_DATABASE_URL.');
  }

  const pool = new pg.Pool({ connectionString });
  try {
    await migrate(drizzle(pool), { migrationsFolder: 'src/db/migrations' });
  } finally {
    await pool.end();
  }
}
