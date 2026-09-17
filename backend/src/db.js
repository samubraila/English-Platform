import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = process.env.DB_PATH || join(here, '..', 'data', 'wordtrace.db');

mkdirSync(dirname(file), { recursive: true });

export const db = new Database(file);
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));

export const today = () => new Date().toISOString().slice(0, 10);
