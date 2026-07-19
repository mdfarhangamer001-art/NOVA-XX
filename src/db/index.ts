// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq, desc } from 'drizzle-orm'
import * as schema from './schema.ts'

// Function to create a new connection pool.
export const createPool = (): Pool => {
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000
  })
}

// Create a pool instance.
const pool = createPool()

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err)
})

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema })

// Synchronize or create user
export async function getOrCreateUser(uid: string, email: string) {
  try {
    const existing = await db.select().from(schema.users).where(eq(schema.users.uid, uid)).limit(1)
    if (existing.length > 0) return existing[0]
    const inserted = await db.insert(schema.users).values({ uid, email }).returning()
    return inserted[0]
  } catch (error) {
    console.error('[NOVA-X DB] Failed to get or create user:', error)
    throw new Error('Database user synchronization failed.', { cause: error })
  }
}

// User Interactions: Notes / Memories
export async function createNote(userId: number, title: string, content: string) {
  return (await db.insert(schema.notes).values({ userId, title, content }).returning())[0]
}

export async function getNotes(userId: number) {
  return await db.select().from(schema.notes).where(eq(schema.notes.userId, userId)).orderBy(desc(schema.notes.createdAt))
}

// User Interactions: Activity Logs
export async function logActivity(userId: number, text: string, type: string = 'SYSTEM') {
  return (await db.insert(schema.activityLogs).values({ userId, text, type }).returning())[0]
}

export async function getActivityLogs(userId: number, limit: number = 50) {
  return await db.select().from(schema.activityLogs).where(eq(schema.activityLogs.userId, userId)).orderBy(desc(schema.activityLogs.timestamp)).limit(limit)
}
