import { Router } from 'express';
import { db, today } from '../db.js';
import { requireAuth } from '../auth.js';
import { DAILY_GOAL_RANGE, LEVELS } from '../constants.js';

const router = Router();
router.use(requireAuth);

function streakOf(userId) {
  const days = db.prepare('SELECT day FROM progress WHERE user_id = ? AND exercises > 0 ORDER BY day DESC LIMIT 400').all(userId).map((row) => row.day);
  if (!days.length) return 0;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today() && days[0] !== yesterday) return 0;
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
  const user = db.prepare('SELECT daily_goal, level FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'Your session is no longer valid. Please sign in again.' });
  const day = db.prepare('SELECT exercises, correct, seconds FROM progress WHERE user_id = ? AND day = ?').get(userId, today()) || { exercises: 0, correct: 0, seconds: 0 };
  const totals = db.prepare('SELECT COUNT(*) AS answers, SUM(correct) AS correct, SUM(seconds) AS seconds FROM answers WHERE user_id = ?').get(userId);
  const recent = db.prepare('SELECT ROUND(AVG(score)) AS score FROM answers WHERE user_id = ? AND id > (SELECT COALESCE(MAX(id), 0) - 20 FROM answers WHERE user_id = ?)').get(userId, userId);

  res.json({
    today: { ...day, goal: user.daily_goal },
    streak: streakOf(userId),
    totals: { answers: totals.answers, correct: totals.correct || 0, seconds: totals.seconds || 0 },
    accuracy: totals.answers ? Math.round(((totals.correct || 0) / totals.answers) * 100) : 0,
    recentScore: recent?.score || 0,
    weakWords: db.prepare('SELECT COUNT(*) AS count FROM words WHERE user_id = ? AND mistakes > correct').get(userId).count,
    dueReviews: db.prepare('SELECT COUNT(*) AS count FROM reviews WHERE user_id = ? AND due <= ?').get(userId, today()).count,
    level: user.level
  });
});

router.get('/statistics', (req, res) => {
  const userId = req.user.id;
  res.json({
    days: db.prepare("SELECT day, exercises, correct, seconds FROM progress WHERE user_id = ? AND day >= date('now', '-27 days') ORDER BY day").all(userId),
    mistakeTypes: db.prepare('SELECT type, COUNT(*) AS count FROM mistakes WHERE user_id = ? GROUP BY type ORDER BY count DESC').all(userId),
    modes: db.prepare('SELECT mode, COUNT(*) AS count, ROUND(AVG(score)) AS score FROM answers WHERE user_id = ? GROUP BY mode ORDER BY count DESC').all(userId),
    levels: db
      .prepare(
        'SELECT e.level, COUNT(*) AS answers, ROUND(AVG(a.score)) AS score FROM answers a JOIN exercises e ON e.id = a.exercise_id ' +
          'WHERE a.user_id = ? GROUP BY e.level ORDER BY e.level'
      )
      .all(userId),
    categories: db
      .prepare(
        'SELECT c.slug, c.name, c.icon, COUNT(*) AS answers, ROUND(AVG(a.score)) AS score FROM answers a ' +
          'JOIN exercises e ON e.id = a.exercise_id JOIN categories c ON c.id = e.category_id WHERE a.user_id = ? GROUP BY c.id ORDER BY answers DESC'
      )
      .all(userId)
  });
});

router.get('/weak-words', (req, res) => {
  res.json({
    words: db
      .prepare('SELECT word, mistakes, correct, last_seen FROM words WHERE user_id = ? AND mistakes > 0 ORDER BY mistakes DESC, last_seen DESC LIMIT 40')
      .all(req.user.id)
  });
});

router.get('/mistakes', (req, res) => {
  res.json({
    mistakes: db
      .prepare(
        'SELECT m.type, m.word, m.expected, m.message, m.created_at, e.text, e.id AS exercise_id FROM mistakes m ' +
          'JOIN answers a ON a.id = m.answer_id JOIN exercises e ON e.id = a.exercise_id ' +
          "WHERE m.user_id = ? AND m.type <> 'capitalization' ORDER BY m.id DESC LIMIT 20"
      )
      .all(req.user.id)
  });
});

router.get('/settings', (req, res) => {
  const user = db.prepare('SELECT email, daily_goal, level, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ ...user, levels: LEVELS });
});

router.put('/settings', (req, res) => {
  const goal = Number.parseInt(req.body?.daily_goal, 10);
  const level = req.body?.level === null || req.body?.level === '' ? null : req.body?.level;
  const [min, max] = DAILY_GOAL_RANGE;
  if (!Number.isInteger(goal) || goal < min || goal > max) return res.status(400).json({ error: 'The daily goal must be between ' + min + ' and ' + max + '.' });
  if (level !== null && !LEVELS.includes(level)) return res.status(400).json({ error: 'Unknown level.' });

  db.prepare('UPDATE users SET daily_goal = ?, level = ? WHERE id = ?').run(goal, level, req.user.id);
  res.json({ daily_goal: goal, level });
});

router.get('/export', (req, res) => {
  const userId = req.user.id;
  const data = {
    exported_at: new Date().toISOString(),
    email: req.user.email,
    progress: db.prepare('SELECT day, exercises, correct, seconds FROM progress WHERE user_id = ? ORDER BY day').all(userId),
    words: db.prepare('SELECT word, mistakes, correct FROM words WHERE user_id = ? ORDER BY mistakes DESC').all(userId),
    answers: db
      .prepare(
        'SELECT a.created_at, a.mode, a.score, a.correct, a.input, e.text FROM answers a JOIN exercises e ON e.id = a.exercise_id ' +
          'WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 2000'
      )
      .all(userId)
  };
  res.set('Content-Disposition', 'attachment; filename="wordtrace-export.json"');
  res.json(data);
});

export default router;
