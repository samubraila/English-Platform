import { Router } from 'express';
import { db, today } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const DAILY_GOAL = Number.parseInt(process.env.DAILY_GOAL, 10) || 20;

function streakOf(userId) {
  const days = db.prepare('SELECT day FROM progress WHERE user_id = ? AND exercises > 0 ORDER BY day DESC LIMIT 400').all(userId).map((row) => row.day);
  if (!days.length) return 0;
  const start = new Date(today() + 'T00:00:00Z');
  if (days[0] !== today() && days[0] !== new Date(start.getTime() - 86400000).toISOString().slice(0, 10)) return 0;
  let streak = 0;
  let cursor = new Date(days[0] + 'T00:00:00Z');
  for (const day of days) {
    if (day !== cursor.toISOString().slice(0, 10)) break;
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

router.get('/progress', (req, res) => {
  const userId = req.user.id;
  const day = db.prepare('SELECT exercises, correct, seconds FROM progress WHERE user_id = ? AND day = ?').get(userId, today()) || { exercises: 0, correct: 0, seconds: 0 };
  const totals = db.prepare('SELECT COUNT(*) AS answers, SUM(correct) AS correct, SUM(seconds) AS seconds FROM answers WHERE user_id = ?').get(userId);
  const weakWords = db.prepare('SELECT COUNT(*) AS count FROM words WHERE user_id = ? AND mistakes > correct').get(userId).count;

  res.json({
    today: { ...day, goal: DAILY_GOAL },
    streak: streakOf(userId),
    totals: { answers: totals.answers, correct: totals.correct || 0, seconds: totals.seconds || 0 },
    accuracy: totals.answers ? Math.round(((totals.correct || 0) / totals.answers) * 100) : 0,
    weakWords
  });
});

router.get('/statistics', (req, res) => {
  const userId = req.user.id;
  res.json({
    days: db.prepare("SELECT day, exercises, correct FROM progress WHERE user_id = ? AND day >= date('now', '-13 days') ORDER BY day").all(userId),
    mistakeTypes: db.prepare('SELECT type, COUNT(*) AS count FROM mistakes WHERE user_id = ? GROUP BY type ORDER BY count DESC').all(userId),
    modes: db.prepare('SELECT mode, COUNT(*) AS count, ROUND(AVG(score)) AS score FROM answers WHERE user_id = ? GROUP BY mode ORDER BY count DESC').all(userId),
    categories: db
      .prepare(
        'SELECT c.slug, c.name, COUNT(*) AS answers, ROUND(AVG(a.score)) AS score FROM answers a ' +
          'JOIN exercises e ON e.id = a.exercise_id JOIN categories c ON c.id = e.category_id WHERE a.user_id = ? GROUP BY c.id ORDER BY answers DESC'
      )
      .all(userId)
  });
});

router.get('/weak-words', (req, res) => {
  const rows = db
    .prepare('SELECT word, mistakes, correct, last_seen FROM words WHERE user_id = ? AND mistakes > 0 ORDER BY mistakes DESC, last_seen DESC LIMIT 30')
    .all(req.user.id);
  res.json({ words: rows });
});

router.get('/mistakes', (req, res) => {
  const rows = db
    .prepare(
      'SELECT m.type, m.word, m.expected, m.message, m.created_at, e.text FROM mistakes m ' +
        'JOIN answers a ON a.id = m.answer_id JOIN exercises e ON e.id = a.exercise_id ' +
        'WHERE m.user_id = ? AND m.type <> ? ORDER BY m.id DESC LIMIT 15'
    )
    .all(req.user.id, 'capitalization');
  res.json({ mistakes: rows });
});

export default router;
