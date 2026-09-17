PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  level TEXT NOT NULL,
  text TEXT NOT NULL UNIQUE,
  corrupted TEXT,
  hint TEXT
);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category_id, level);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  mode TEXT NOT NULL,
  input TEXT NOT NULL,
  score INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_answers_user ON answers(user_id, created_at);

CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY,
  answer_id INTEGER NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  word TEXT,
  expected TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON mistakes(user_id, created_at);

CREATE TABLE IF NOT EXISTS words (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  mistakes INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, word)
);

CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  exercises INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
