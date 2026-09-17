const ARTICLES = new Set(['a', 'an', 'the']);
const AUX = new Set(['is', 'are', 'am', 'was', 'were', 'be', 'been', 'being', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'must', 'may', 'might']);
const PREPOSITIONS = new Set(['in', 'on', 'at', 'to', 'for', 'from', 'with', 'without', 'by', 'about', 'into', 'over', 'under', 'after', 'before', 'between', 'during', 'through', 'against', 'of']);
const PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their']);
const STOPWORDS = new Set([...ARTICLES, ...AUX, ...PREPOSITIONS, ...PRONOUNS, 'and', 'or', 'but', 'that', 'this', 'not', 'so']);

const GRAMMAR_TYPES = ['wrong_tense', 'wrong_article', 'wrong_preposition', 'number', 'missing_to', 'missing_auxiliary', 'missing_article', 'missing_preposition'];

export const words = (text) => (text || '').trim().split(/\s+/).filter(Boolean);
export const normalize = (word) => word.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
export const firstLetters = (text) => words(text).map((w) => (normalize(w)[0] || w[0]).toUpperCase()).join(' ');

export function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = current;
    }
  }
  return row[b.length];
}

function align(target, user) {
  const n = target.length;
  const m = user.length;
  const table = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = target[i] === user[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (target[i] === user[j]) ops.push({ op: 'equal', i: i++, j: j++ });
    else if (table[i + 1][j] >= table[i][j + 1]) ops.push({ op: 'missing', i: i++ });
    else ops.push({ op: 'extra', j: j++ });
  }
  while (i < n) ops.push({ op: 'missing', i: i++ });
  while (j < m) ops.push({ op: 'extra', j: j++ });
  return ops;
}

function classifyMissing(word) {
  if (ARTICLES.has(word)) return { type: 'missing_article', message: 'The article "' + word + '" is missing.' };
  if (word === 'to') return { type: 'missing_to', message: 'The infinitive marker "to" is missing.' };
  if (AUX.has(word)) return { type: 'missing_auxiliary', message: 'The verb form "' + word + '" is missing.' };
  if (PREPOSITIONS.has(word)) return { type: 'missing_preposition', message: 'The preposition "' + word + '" is missing.' };
  return { type: 'missing_word', message: 'The word "' + word + '" is missing.' };
}

function classifySubstitution(expected, given) {
  if (expected + 's' === given || given + 's' === expected || expected + 'es' === given || given + 'es' === expected) {
    return { type: 'number', message: 'Singular or plural: use "' + expected + '", not "' + given + '".' };
  }
  if (ARTICLES.has(expected) && ARTICLES.has(given)) return { type: 'wrong_article', message: 'Wrong article: "' + expected + '", not "' + given + '".' };
  if (AUX.has(expected) && AUX.has(given)) return { type: 'wrong_tense', message: 'Wrong verb form: "' + expected + '", not "' + given + '".' };
  if (PREPOSITIONS.has(expected) && PREPOSITIONS.has(given)) return { type: 'wrong_preposition', message: 'Wrong preposition: "' + expected + '", not "' + given + '".' };
  if (levenshtein(expected, given) <= Math.max(1, Math.floor(expected.length / 4))) {
    return { type: 'spelling', message: 'Spelling: "' + expected + '", not "' + given + '".' };
  }
  return { type: 'wrong_word', message: 'Use "' + expected + '" instead of "' + given + '".' };
}

export function analyze(targetText, userText) {
  const targetRaw = words(targetText);
  const userRaw = words(userText);
  const target = targetRaw.map(normalize);
  const user = userRaw.map(normalize);

  const ops = align(target, user);
  const merged = [];
  for (let k = 0; k < ops.length; k++) {
    const a = ops[k];
    const b = ops[k + 1];
    if (a.op === 'missing' && b && b.op === 'extra') {
      merged.push({ op: 'wrong', i: a.i, j: b.j });
      k++;
    } else if (a.op === 'extra' && b && b.op === 'missing') {
      merged.push({ op: 'wrong', i: b.i, j: a.j });
      k++;
    } else {
      merged.push(a);
    }
  }

  const missingWords = merged.filter((o) => o.op === 'missing').map((o) => target[o.i]);
  const extraWords = merged.filter((o) => o.op === 'extra').map((o) => user[o.j]);

  const tokens = [];
  const mistakes = [];
  let matched = 0;

  for (const op of merged) {
    if (op.op === 'equal') {
      const exact = targetRaw[op.i] === userRaw[op.j];
      tokens.push({ status: exact ? 'correct' : 'minor', word: userRaw[op.j], expected: targetRaw[op.i] });
      matched++;
      if (!exact) {
        mistakes.push({ type: 'capitalization', word: user[op.j], expected: target[op.i], message: 'Write "' + targetRaw[op.i] + '" (capitalisation or punctuation).' });
      }
    } else if (op.op === 'missing') {
      const word = target[op.i];
      if (extraWords.includes(word)) {
        tokens.push({ status: 'order', word: targetRaw[op.i], expected: targetRaw[op.i] });
        mistakes.push({ type: 'word_order', word, expected: word, message: 'The word "' + targetRaw[op.i] + '" is in the wrong position.' });
      } else {
        const info = classifyMissing(word);
        tokens.push({ status: 'missing', word: targetRaw[op.i], expected: targetRaw[op.i] });
        mistakes.push({ ...info, word, expected: word });
      }
    } else if (op.op === 'extra') {
      if (missingWords.includes(user[op.j])) continue;
      tokens.push({ status: 'extra', word: userRaw[op.j], expected: null });
      mistakes.push({ type: 'extra_word', word: user[op.j], expected: null, message: 'The word "' + userRaw[op.j] + '" does not belong in this sentence.' });
    } else {
      const info = classifySubstitution(target[op.i], user[op.j]);
      tokens.push({ status: info.type === 'spelling' ? 'spelling' : 'wrong', word: userRaw[op.j], expected: targetRaw[op.i] });
      mistakes.push({ ...info, word: user[op.j], expected: target[op.i] });
    }
  }

  const total = Math.max(target.length, user.length, 1);
  const penalty = mistakes.reduce((sum, m) => sum + (m.type === 'capitalization' ? 0.25 : 1), 0);
  const correct = mistakes.every((m) => m.type === 'capitalization');
  const score = correct ? 100 : Math.max(0, Math.round(((total - penalty) / total) * 100));

  return {
    score,
    correct,
    tokens,
    mistakes,
    correction: targetText,
    summary: {
      words: target.length,
      matched,
      missing: mistakes.filter((m) => m.type.startsWith('missing')).length,
      grammar: mistakes.filter((m) => GRAMMAR_TYPES.includes(m.type)).length,
      spelling: mistakes.filter((m) => m.type === 'spelling').length,
      order: mistakes.filter((m) => m.type === 'word_order').length,
      extra: mistakes.filter((m) => m.type === 'extra_word').length
    }
  };
}

export function blankIndex(text, seed = 0) {
  const indexed = words(text).map((w, i) => [normalize(w), i]);
  const candidates = indexed.filter(([w, i]) => i > 0 && (AUX.has(w) || ARTICLES.has(w) || PREPOSITIONS.has(w)));
  const pool = candidates.length ? candidates : indexed.filter(([, i]) => i > 0);
  return pool[Math.abs(seed) % pool.length][1];
}

export const isContentWord = (word) => word.length > 2 && !STOPWORDS.has(word);
export const contentWords = (text) => [...new Set(words(text).map(normalize).filter(isContentWord))];
