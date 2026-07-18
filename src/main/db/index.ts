import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

export const createPool = () => {
  const host = process.env.SQL_HOST;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  const database = process.env.SQL_DB_NAME;

  if (!host) {
    console.warn('[NOVA-X DB] SQL_HOST is not set. Database operations will be unavailable.');
  }

  return new Pool({
    host: host,
    user: user,
    password: password,
    database: database,
    connectionTimeoutMillis: 15000,
  });
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('[NOVA-X DB] Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });

// Synchronize or create user on Google login
export async function getOrCreateUser(uid: string, email: string) {
  try {
    const existing = await db.select().from(schema.users).where(eq(schema.users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const inserted = await db.insert(schema.users).values({ uid, email }).returning();
    return inserted[0];
  } catch (error) {
    console.error('[NOVA-X DB] Failed to get or create user:', error);
    throw new Error('Database user synchronization failed.', { cause: error });
  }
}
