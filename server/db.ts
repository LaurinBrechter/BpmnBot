import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, text, jsonb, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import type { StoredDiagram, SharedDiagram } from '../shared/validation.js';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
export const db = drizzle(pool);
export const workspaces = pgTable('diagram_workspace', {
  userId: text('userId').primaryKey(), sessions: jsonb('sessions').$type<StoredDiagram[]>().notNull(),
  revision: integer('revision').notNull().default(0), updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});
export const shares = pgTable('diagram_share', {
  userId: text('userId').notNull(), diagramId: text('diagramId').notNull(), tokenHash: text('tokenHash').notNull().unique(),
  snapshot: jsonb('snapshot').$type<SharedDiagram>().notNull(), createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.userId, t.diagramId] })]);
