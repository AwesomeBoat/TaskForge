import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getEnv } from '@/lib/env';
import * as schema from './schema';

// Reuse the pool across hot reloads in development, otherwise every edit leaks connections.
const globalForDb = globalThis as unknown as { __taskforgePool?: Pool };

function getPool(): Pool {
  if (globalForDb.__taskforgePool) return globalForDb.__taskforgePool;
  const pool = new Pool({ connectionString: getEnv().DATABASE_URL, max: 10 });
  globalForDb.__taskforgePool = pool;
  return pool;
}

export const db = drizzle(getPool(), { schema });
export type Db = typeof db;
