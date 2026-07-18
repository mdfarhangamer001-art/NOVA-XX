import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define users table using Google/Firebase UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Google/Firebase sub UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define memories/notes table
export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define activity logs table
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  text: text('text').notNull(),
  type: text('type').notNull(), // 'SYSTEM', 'AUTH', 'ADB', etc.
  timestamp: timestamp('timestamp').defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  notes: many(notes),
  activityLogs: many(activityLogs),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));
