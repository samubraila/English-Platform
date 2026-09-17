import { Router } from 'express';
import { db, today } from '../db.js';
import { requireAuth } from '../auth.js';
import { analyze, blankIndex, contentWords, firstLetters, isContentWord, normalize, words } from '../analyzer.js';

export const MODES = ['first-letter', 'reconstruction', 'missing-word', 'grammar', 'listening'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const router = Router();
router.use(requireAuth);

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function weakWordsOf(userId) {
  return db
    .prepare('SELECT word FROM words WHERE user_id = ? AND mistakes > correct ORDER BY mistakes DESC LIMIT 8')
    .all(userId)
    .map((row) => row.word);
}

function pickExercise(userId, { mode, category, level, exclude }) {
  const weak = weakWordsOf(userId);
  const weakScore = weak.length ? weak.map(() => 'CASE WHEN lower(e.text) LIKE ? THEN 1 ELSE 0 END').join(' + ') : '0';
  const params = weak.map((word) => '%' + word + '%');
  params.push(userId);

  const filters = ['1 = 1'];
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
    'SELECT e.id, e.text, e.corrupted, e.level, c.slug AS category, c.name AS category_name, ' +
    '(' + weakScore + ') AS weak_score, COALESCE(a.seen, 0) AS seen ' +
    'FROM exercises e JOIN categories c ON c.id = e.category_id ' +
    'LEFT JOIN (SELECT exercise_id, COUNT(*) AS seen FROM answers WHERE user_id = ? GROUP BY exercise_id) a ON a.exercise_id = e.id ' +
    'WHERE ' + filters.join(' AND ') + ' ORDER BY seen ASC, weak_score DESC, RANDOM() LIMIT 1';

  return db.prepare(sql).get(...params);
}

function buildPrompt(exercise, mode) {
  const base = {
    id: exercise.id,
    mode,
    level: exercise.level,
    category: exercise.category,
    categoryName: exercise.category_name,
    wordCount: words(exercise.text).length
  };
  if (mode === 'first-letter') return { ...base, prompt: firstLetters(exercise.text), instruction: 'Write the full sentence behind these first letters.' };
  if (mode === 'reconstruction') return { ...base, tokens: shuffle(words(exercise.text).map((w) => w.replace(/[.,!?]$/, ''))), instruction: 'Put the words into the correct order.' };
  if (mode === 'missing-word') {
    const list = words(exercise.text);
    const index = blankIndex(exercise.text, exercise.id);
    return { ...base, prompt: list.map((w, i) => (i === index ? '___' : w)).join(' '), instruction: 'Fill in the missing word.', wordCount: 1 };
  }
  if (mode === 'grammar') return { ...base, prompt: exercise.corrupted, instruction: 'This sentence contains a mistake. Write the correct version.' };
  return { ...base, speak: exercise.text, instruction: 'Listen and write down what you hear.' };
}

router.get('/categories', (req, res) => {
  const rows = db
    .prepare(
      'SELECT c.slug, c.name, COUNT(e.id) AS exercises, ' +
        '(SELECT COUNT(DISTINCT exercise_id) FROM answers a JOIN exercises e2 ON e2.id = a.exercise_id WHERE a.user_id = ? AND e2.category_id = c.id AND a.correct = 1) AS done ' +
        'FROM categories c LEFT JOIN exercises e ON e.category_id = c.id GROUP BY c.id ORDER BY c.name'
    )
    .all(req.user.id);
  res.json({ categories: rows, levels: LEVELS, modes: MODES });
});

router.get('/next', (req, res) => {
  const mode = MODES.includes(req.query.mode) ? req.query.mode : 'first-letter';
  const category = typeof req.query.category === 'string' && req.query.category ? req.query.category : null;
  const level = LEVELS.includes(req.query.level) ? req.query.level : null;
  const exclude = Number.parseInt(req.query.exclude, 10) || null;

  const exercise = pickExercise(req.user.id, { mode, category, level, exclude });
  if (!exercise) return res.status(404).json({ error: 'No exercises available for this selection.' });
  res.json(buildPrompt(exercise, mode));
});

router.get('/:id', (req, res) => {
  const exercise = db
    .prepare('SELECT e.id, e.text, e.corrupted, e.level, c.slug AS category, c.name AS category_name FROM exercises e JOIN categories c ON c.id = e.category_id WHERE e.id = ?')
    .get(Number.parseInt(req.params.id, 10));
  if (!exercise) return res.status(404).json({ error: 'Exercise not found.' });
  const mode = MODES.includes(req.query.mode) ? req.query.mode : 'first-letter';
  res.json(buildPrompt(exercise, mode));
});

const recordAnswer = db.transaction((userId, exercise, mode, input, result, seconds) => {
  const answerId = db
    .prepare('INSERT INTO answers (user_id, exercise_id, mode, input, score, correct, seconds) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(userId, exercise.id, mode, input, result.score, result.correct ? 1 : 0, seconds).lastInsertRowid;

  const insertMistake = db.prepare('INSERT INTO mistakes (answer_id, user_id, type, word, expected, message) VALUES (?, ?, ?, ?, ?, ?)');
  const bumpWord = db.prepare(
    'INSERT INTO words (user_id, word, mistakes, correct, last_seen) VALUES (?, ?, ?, ?, datetime(\'now\')) ' +
      'ON CONFLICT(user_id, word) DO UPDATE SET mistakes = mistakes + excluded.mistakes, correct = correct + excluded.correct, last_seen = datetime(\'now\')'
  );

  const failed = new Set();
  for (const mistake of result.mistakes) {
    insertMistake.run(answerId, userId, mistake.type, mistake.word, mistake.expected, mistake.message);
    const word = mistake.expected || mistake.word;
    if (word && mistake.type !== 'capitalization' && isContentWord(word)) failed.add(word);
  }
  for (const word of failed) bumpWord.run(userId, word, 1, 0);
  for (const word of contentWords(exercise.text)) {
    if (!failed.has(word)) bumpWord.run(userId, word, 0, 1);
  }

  db.prepare(
    'INSERT INTO progress (user_id, day, exercises, correct, seconds) VALUES (?, ?, 1, ?, ?) ' +
      'ON CONFLICT(user_id, day) DO UPDATE SET exercises = exercises + 1, correct = correct + excluded.correct, seconds = seconds + excluded.seconds'
  ).run(userId, today(), result.correct ? 1 : 0, seconds);

  return answerId;
});

router.post('/:id/answer', (req, res) => {
  const exercise = db.prepare('SELECT id, text, corrupted FROM exercises WHERE id = ?').get(Number.parseInt(req.params.id, 10));
  if (!exercise) return res.status(404).json({ error: 'Exercise not found.' });

  const mode = MODES.includes(req.body?.mode) ? req.body.mode : 'first-letter';
  const input = typeof req.body?.input === 'string' ? req.body.input.trim().slice(0, 500) : '';
  const seconds = Math.min(Math.max(Number.parseInt(req.body?.seconds, 10) || 0, 0), 3600);
  if (!input) return res.status(400).json({ error: 'Please write an answer first.' });

  let result;
  if (mode === 'missing-word') {
    const expected = words(exercise.text)[blankIndex(exercise.text, exercise.id)];
    result = analyze(normalize(expected), normalize(input));
    result.correction = exercise.text;
    result.expected = expected;
  } else {
    result = analyze(exercise.text, input);
  }

  recordAnswer(req.user.id, exercise, mode, input, result, seconds);
  res.json(result);
});

export default router;
