import { Router } from 'express';
import { addDays, db, today } from '../db.js';
import { requireAuth } from '../auth.js';
import { contentWords, isContentWord, words } from '../analyzer.js';
import { MODES, TYPES, buildCard, checkCard, gapWord, isMode, supports } from '../generator.js';
import { LEVELS, MAX_OWN_EXERCISES } from '../constants.js';

const INTERVALS = [1, 3, 7, 16, 35];
const CANDIDATES = 8;

const router = Router();
router.use(requireAuth);

const COLUMNS = 'e.id, e.text, e.corrupted, e.alternatives, e.level, e.owner_id, c.slug AS category, c.name AS category_name, c.icon';
const FROM = ' FROM exercises e JOIN categories c ON c.id = e.category_id ';

function pickReview(userId, mode) {
  const rows = db
    .prepare(
      'SELECT ' + COLUMNS + FROM +
        'JOIN reviews r ON r.exercise_id = e.id WHERE r.user_id = ? AND r.due <= ? ORDER BY r.due, RANDOM() LIMIT ' + CANDIDATES
    )
    .all(userId, today());
  return rows.find((row) => supports(row, mode)) || null;
}

function pickExercise(userId, { mode, category, level, exclude }) {
  const weak = db
    .prepare('SELECT word FROM words WHERE user_id = ? AND mistakes > correct ORDER BY mistakes DESC LIMIT 8')
    .all(userId)
    .map((row) => row.word);

  const weakScore = weak.length ? weak.map(() => 'CASE WHEN lower(e.text) LIKE ? THEN 1 ELSE 0 END').join(' + ') : '0';
  const params = weak.map((word) => '%' + word + '%');
  params.push(userId, userId);

  const filters = ['(e.owner_id IS NULL OR e.owner_id = ?)'];
  if (category) {
    filters.push('c.slug = ?');
    params.push(category);
  }
  if (level) {
    filters.push('e.level = ?');
    params.push(level);
  }
  if (mode === 'grammar') filters.push('e.corrupted IS NOT NULL');
  if (exclude) {
    filters.push('e.id <> ?');
    params.push(exclude);
  }

  const sql =
    'SELECT ' + COLUMNS + ', (' + weakScore + ') AS weak_score, COALESCE(a.seen, 0) AS seen' + FROM +
    'LEFT JOIN (SELECT exercise_id, COUNT(*) AS seen FROM answers WHERE user_id = ? GROUP BY exercise_id) a ON a.exercise_id = e.id ' +
    'WHERE ' + filters.join(' AND ') + ' ORDER BY seen ASC, weak_score DESC, RANDOM() LIMIT ' + CANDIDATES;

  return db.prepare(sql).all(...params).find((row) => supports(row, mode)) || null;
}

router.get('/categories', (req, res) => {
  const categories = db
    .prepare(
      'SELECT c.slug, c.name, c.icon, COUNT(e.id) AS exercises, ' +
        '(SELECT COUNT(DISTINCT a.exercise_id) FROM answers a JOIN exercises e2 ON e2.id = a.exercise_id WHERE a.user_id = ? AND e2.category_id = c.id AND a.correct = 1) AS done ' +
        'FROM categories c LEFT JOIN exercises e ON e.category_id = c.id AND (e.owner_id IS NULL OR e.owner_id = ?) ' +
        'GROUP BY c.id ORDER BY c.sort, c.name'
    )
    .all(req.user.id, req.user.id);

  res.json({
    categories,
    levels: LEVELS,
    modes: MODES.map((mode) => ({ id: mode, label: TYPES[mode].label, ui: TYPES[mode].ui }))
  });
});

router.get('/mine', (req, res) => {
  const exercises = db
    .prepare('SELECT ' + COLUMNS + FROM + 'WHERE e.owner_id = ? ORDER BY e.id DESC')
    .all(req.user.id)
    .map((row) => ({ id: row.id, text: row.text, level: row.level, category: row.category, categoryName: row.category_name }));
  res.json({ exercises });
});

router.post('/', (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim().replace(/\s+/g, ' ').slice(0, 300) : '';
  const category = typeof req.body?.category === 'string' ? req.body.category : '';
  const level = LEVELS.includes(req.body?.level) ? req.body.level : 'B1';

  if (words(text).length < 4) return res.status(400).json({ error: 'A sentence needs at least four words.' });
  const categoryRow = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category);
  if (!categoryRow) return res.status(400).json({ error: 'Please choose a category.' });
  if (db.prepare('SELECT 1 FROM exercises WHERE text = ?').get(text)) return res.status(409).json({ error: 'This sentence already exists.' });
  if (db.prepare('SELECT COUNT(*) AS count FROM exercises WHERE owner_id = ?').get(req.user.id).count >= MAX_OWN_EXERCISES) {
    return res.status(429).json({ error: 'You reached the limit of ' + MAX_OWN_EXERCISES + ' own sentences.' });
  }

  const id = db
    .prepare('INSERT INTO exercises (category_id, level, text, owner_id) VALUES (?, ?, ?, ?)')
    .run(categoryRow.id, level, text, req.user.id).lastInsertRowid;
  res.status(201).json({ id, text, level, category });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM exercises WHERE id = ? AND owner_id = ?').run(Number.parseInt(req.params.id, 10), req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Sentence not found.' });
  res.json({ ok: true });
});

router.get('/next', (req, res) => {
  const mode = isMode(req.query.mode) ? req.query.mode : 'first-letter';
  const category = typeof req.query.category === 'string' && req.query.category ? req.query.category : null;
  const level = LEVELS.includes(req.query.level) ? req.query.level : null;
  const exclude = Number.parseInt(req.query.exclude, 10) || null;

  const due = db.prepare('SELECT COUNT(*) AS count FROM reviews WHERE user_id = ? AND due <= ?').get(req.user.id, today()).count;
  const fromReview = req.query.queue === 'review' ? pickReview(req.user.id, mode) : null;
  const exercise = fromReview || pickExercise(req.user.id, { mode, category, level, exclude });

  if (!exercise) return res.status(404).json({ error: 'No exercises available for this selection.' });
  res.json(buildCard(exercise, mode, { dueReviews: due, review: Boolean(fromReview) }));
});

const recordAnswer = db.transaction((userId, exercise, mode, input, result, seconds, scoredWords) => {
  const answerId = db
    .prepare('INSERT INTO answers (user_id, exercise_id, mode, input, score, correct, seconds) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(userId, exercise.id, mode, input, result.score, result.correct ? 1 : 0, seconds).lastInsertRowid;

  const insertMistake = db.prepare('INSERT INTO mistakes (answer_id, user_id, type, word, expected, message) VALUES (?, ?, ?, ?, ?, ?)');
  const bumpWord = db.prepare(
    "INSERT INTO words (user_id, word, mistakes, correct, last_seen) VALUES (?, ?, ?, ?, datetime('now')) " +
      "ON CONFLICT(user_id, word) DO UPDATE SET mistakes = mistakes + excluded.mistakes, correct = correct + excluded.correct, last_seen = datetime('now')"
  );

  const failed = new Set();
  for (const mistake of result.mistakes.slice(0, 40)) {
    insertMistake.run(answerId, userId, mistake.type, mistake.word, mistake.expected, mistake.message);
    const word = mistake.expected || mistake.word;
    if (word && mistake.type !== 'capitalization' && isContentWord(word)) failed.add(word);
  }
  for (const word of failed) bumpWord.run(userId, word, 1, 0);
  for (const word of scoredWords) {
    if (!failed.has(word)) bumpWord.run(userId, word, 0, 1);
  }

  db.prepare(
    'INSERT INTO progress (user_id, day, exercises, correct, seconds) VALUES (?, ?, 1, ?, ?) ' +
      'ON CONFLICT(user_id, day) DO UPDATE SET exercises = exercises + 1, correct = correct + excluded.correct, seconds = seconds + excluded.seconds'
  ).run(userId, today(), result.correct ? 1 : 0, seconds);

  const review = db.prepare('SELECT step FROM reviews WHERE user_id = ? AND exercise_id = ?').get(userId, exercise.id);
  if (!result.correct) {
    db.prepare(
      'INSERT INTO reviews (user_id, exercise_id, due, step, lapses) VALUES (?, ?, ?, 0, 1) ' +
        'ON CONFLICT(user_id, exercise_id) DO UPDATE SET due = excluded.due, step = 0, lapses = reviews.lapses + 1'
    ).run(userId, exercise.id, today());
    return { due: today() };
  }
  if (review) {
    const step = review.step + 1;
    if (step >= INTERVALS.length) {
      db.prepare('DELETE FROM reviews WHERE user_id = ? AND exercise_id = ?').run(userId, exercise.id);
      return { due: null, graduated: true };
    }
    db.prepare('UPDATE reviews SET due = ?, step = ? WHERE user_id = ? AND exercise_id = ?').run(addDays(INTERVALS[step]), step, userId, exercise.id);
    return { due: addDays(INTERVALS[step]) };
  }
  return { due: null };
});

router.post('/:id/answer', (req, res) => {
  const exercise = db
    .prepare('SELECT ' + COLUMNS + FROM + 'WHERE e.id = ? AND (e.owner_id IS NULL OR e.owner_id = ?)')
    .get(Number.parseInt(req.params.id, 10), req.user.id);
  if (!exercise) return res.status(404).json({ error: 'Exercise not found.' });

  const mode = isMode(req.body?.mode) ? req.body.mode : 'first-letter';
  if (!supports(exercise, mode)) return res.status(400).json({ error: 'This exercise does not work in that mode.' });

  const input = typeof req.body?.input === 'string' ? req.body.input.trim().slice(0, 500) : '';
  const seconds = Math.min(Math.max(Number.parseInt(req.body?.seconds, 10) || 0, 0), 3600);
  const card = { gap: Number.parseInt(req.body?.gap, 10) };
  if (!input) return res.status(400).json({ error: 'Please write an answer first.' });

  const result = checkCard(exercise, mode, input, card);
  const single = gapWord(exercise, card);
  const scoredWords = result.expected === undefined ? contentWords(exercise.text) : single && isContentWord(single) ? [single] : [];

  const stored = recordAnswer(req.user.id, exercise, mode, input, result, seconds, scoredWords);
  res.json({ ...result, nextReview: stored.due, graduated: Boolean(stored.graduated) });
});

export default router;
