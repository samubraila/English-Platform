import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = process.env.DB_PATH || join(here, '..', 'data', 'wordtrace.db');

mkdirSync(dirname(file), { recursive: true });

export const db = new Database(file);
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));

const addColumn = (table, column, definition) => {
  const exists = db.prepare('SELECT 1 FROM pragma_table_info(?) WHERE name = ?').get(table, column);
  if (!exists) db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + definition);
};

addColumn('users', 'daily_goal', 'INTEGER NOT NULL DEFAULT 20');
addColumn('users', 'level', 'TEXT');
addColumn('exercises', 'alternatives', 'TEXT');
addColumn('exercises', 'owner_id', 'INTEGER REFERENCES users(id) ON DELETE CASCADE');
addColumn('categories', 'icon', "TEXT NOT NULL DEFAULT '•'");
addColumn('categories', 'sort', 'INTEGER NOT NULL DEFAULT 100');

export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
