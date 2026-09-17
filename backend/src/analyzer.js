const ARTICLES = new Set(['a', 'an', 'the']);
const AUX = new Set(['is', 'are', 'am', 'was', 'were', 'be', 'been', 'being', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'must', 'may', 'might']);
const PREPOSITIONS = new Set(['in', 'on', 'at', 'to', 'for', 'from', 'with', 'without', 'by', 'about', 'into', 'over', 'under', 'after', 'before', 'between', 'during', 'through', 'against', 'of', 'until', 'since']);
const PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their']);
const STOPWORDS = new Set([...ARTICLES, ...AUX, ...PREPOSITIONS, ...PRONOUNS, 'and', 'or', 'but', 'that', 'this', 'not', 'so']);

const GRAMMAR_TYPES = new Set(['wrong_tense', 'wrong_article', 'wrong_preposition', 'number', 'missing_to', 'missing_auxiliary', 'missing_article', 'missing_preposition']);

const CONTRACTIONS = {
  "i'm": 'i am',
  "you're": 'you are',
  "we're": 'we are',
  "they're": 'they are',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "that's": 'that is',
  "there's": 'there is',
  "who's": 'who is',
  "what's": 'what is',
  "let's": 'let us',
  "i've": 'i have',
  "you've": 'you have',
  "we've": 'we have',
  "they've": 'they have',
  "i'll": 'i will',
  "you'll": 'you will',
  "we'll": 'we will',
  "he'll": 'he will',
  "she'll": 'she will',
  "it'll": 'it will',
  "they'll": 'they will',
  "i'd": 'i would',
  "you'd": 'you would',
  "we'd": 'we would',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "hasn't": 'has not',
  "haven't": 'have not',
  "hadn't": 'had not',
  "won't": 'will not',
  "wouldn't": 'would not',
  "can't": 'can not',
  cannot: 'can not',
  "couldn't": 'could not',
  "shouldn't": 'should not',
  "mustn't": 'must not'
};

const SPELLING_VARIANTS = {
  organise: 'organize',
  organised: 'organized',
  realise: 'realize',
  realised: 'realized',
  apologise: 'apologize',
  apologised: 'apologized',
  analyse: 'analyze',
  analysed: 'analyzed',
  centre: 'center',
  colour: 'color',
  behaviour: 'behavior',
  licence: 'license',
  practise: 'practice',
  programme: 'program',
  catalogue: 'catalog',
  travelling: 'traveling',
  cancelled: 'canceled'
};

const EXPLANATIONS = {
  missing_to: 'After need, have, want, try, decide and forget the verb takes the infinitive with "to": "I need to restart it".',
  missing_article: 'A countable noun in the singular needs an article: "the server", "a container".',
  missing_auxiliary: 'English needs the helping verb. Present progressive uses is/are, the perfect uses has/have.',
  missing_preposition: 'The preposition belongs to the verb or the time expression and cannot be left out.',
  missing_word: 'Read the sentence again slowly. One word of the original is not in your answer.',
  wrong_article: 'Use "a" before a consonant sound, "an" before a vowel sound, and "the" when both sides know which thing you mean.',
  wrong_tense: 'Check the time of the action: present, past, present perfect or a modal verb.',
  wrong_preposition: 'Prepositions are fixed: "depend on", "wait for", "in the morning", "at six".',
  number: 'Countable nouns take -s in the plural, and a singular subject takes a verb with -s.',
  spelling: 'Check the letters one by one, especially double letters and silent letters.',
  word_order: 'English word order is subject, verb, object. Adverbs of frequency stand before the main verb.',
  extra_word: 'This word is not needed. Shorter sentences are usually more correct.',
  capitalization: 'Sentences start with a capital letter, product names keep their capital letter, and a sentence ends with a full stop.'
};

const ADVICE = [
  [/\bsince\s+(a\s+few|\d+|one|two|three|four|five|several)\s+(second|minute|hour|day|week|month|year)s?\b/i, 'Use "for" with a period of time ("for three years") and "since" with a starting point ("since Monday").'],
  [/\bi\s+am\s+agree\b/i, 'Say "I agree", not "I am agree". Agree is a verb, not an adjective.'],
  [/\binformations\b/i, '"Information" is uncountable: no plural -s. Say "some information" or "two pieces of information".'],
  [/\b(softwares|hardwares|feedbacks|advices|equipments)\b/i, 'This word is uncountable in English and has no plural -s.'],
  [/\bpeoples\b/i, '"People" is already plural. Use "people", not "peoples".'],
  [/\bmore\s+(easy|fast|small|big|cheap|quick|old|new|slow|short|long)\b/i, 'Short adjectives form the comparative with -er: "easier", "faster", not "more easy".'],
  [/\bexplain\s+me\b/i, 'Say "explain it to me" or "explain the problem to me".'],
  [/\bdiscuss\s+about\b/i, 'Discuss takes no preposition: "discuss the problem".'],
  [/\bdepends?\s+of\b/i, 'It is "depend on", not "depend of".'],
  [/\b(can|must|should|will|would)\s+to\s+\w+/i, 'After a modal verb the infinitive has no "to": "can restart", not "can to restart".'],
  [/\b(he|she|it)\s+(don't|do not|have)\b/i, 'Third person singular uses "does not" and "has".'],
  [/\bi\s+(?!am\b|was\b)[a-z]/, 'The pronoun "I" is always written with a capital letter.'],
  [/\bin\s+the\s+monday\b|\bin\s+monday\b/i, 'Use "on" with days: "on Monday".']
];

export const words = (text) => (text || '').trim().split(/\s+/).filter(Boolean);
export const normalize = (word) => word.toLowerCase().replace(/[’]/g, "'").replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
export const firstLetters = (text) => words(text).map((w) => (normalize(w)[0] || w[0]).toUpperCase()).join(' ');
export const isContentWord = (word) => word.length > 2 && !STOPWORDS.has(word);
export const contentWords = (text) => [...new Set(words(text).map(normalize).filter(isContentWord))];

function tokenize(text) {
  const tokens = [];
  words(text).forEach((raw, rawIndex) => {
    const norm = normalize(raw);
    const parts = CONTRACTIONS[norm] ? CONTRACTIONS[norm].split(' ') : [SPELLING_VARIANTS[norm] || norm];
    const variant = parts.length > 1 || parts[0] !== norm;
    parts.forEach((part) => tokens.push({ raw, norm: part, rawIndex, variant }));
  });
  return tokens;
}

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
      table[i][j] = target[i].norm === user[j].norm ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (target[i].norm === user[j].norm) ops.push({ op: 'equal', i: i++, j: j++ });
    else if (table[i + 1][j] >= table[i][j + 1]) ops.push({ op: 'missing', i: i++ });
    else ops.push({ op: 'extra', j: j++ });
  }
  while (i < n) ops.push({ op: 'missing', i: i++ });
  while (j < m) ops.push({ op: 'extra', j: j++ });
  return ops;
}

function classifyMissing(word, next) {
  if (ARTICLES.has(word)) return { type: 'missing_article', message: 'The article "' + word + '" is missing before "' + (next || 'the noun') + '".' };
  if (word === 'to') return { type: 'missing_to', message: 'The infinitive marker "to" is missing.' };
  if (AUX.has(word)) return { type: 'missing_auxiliary', message: 'The verb form "' + word + '" is missing.' };
  if (PREPOSITIONS.has(word)) return { type: 'missing_preposition', message: 'The preposition "' + word + '" is missing.' };
  return { type: 'missing_word', message: 'The word "' + word + '" is missing.' };
}

function classifySubstitution(expected, given) {
  if (expected + 's' === given || given + 's' === expected || expected + 'es' === given || given + 'es' === expected) {
    return { type: 'number', message: 'Use "' + expected + '", not "' + given + '".' };
  }
  if (ARTICLES.has(expected) && ARTICLES.has(given)) return { type: 'wrong_article', message: 'Wrong article: "' + expected + '", not "' + given + '".' };
  if (AUX.has(expected) && AUX.has(given)) return { type: 'wrong_tense', message: 'Wrong verb form: "' + expected + '", not "' + given + '".' };
  if (PREPOSITIONS.has(expected) && PREPOSITIONS.has(given)) return { type: 'wrong_preposition', message: 'Wrong preposition: "' + expected + '", not "' + given + '".' };
  if (levenshtein(expected, given) <= Math.max(1, Math.floor(expected.length / 4))) {
    return { type: 'spelling', message: 'Spelling: "' + expected + '", not "' + given + '".' };
  }
  return { type: 'wrong_word', message: 'Use "' + expected + '" instead of "' + given + '".' };
}

function compare(targetText, userText) {
  const target = tokenize(targetText);
  const user = tokenize(userText);
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

  const missingWords = merged.filter((o) => o.op === 'missing').map((o) => target[o.i].norm);
  const extraWords = merged.filter((o) => o.op === 'extra').map((o) => user[o.j].norm);

  const tokens = [];
  const mistakes = [];
  let matched = 0;
  let lastKey = null;

  const emit = (status, word, expected, key) => {
    if (status === 'correct' && key && key === lastKey) return;
    lastKey = status === 'correct' ? key : null;
    tokens.push({ status, word, expected });
  };

  for (const op of merged) {
    if (op.op === 'equal') {
      const targetToken = target[op.i];
      const userToken = user[op.j];
      const variant = targetToken.variant || userToken.variant;
      const exact = targetToken.raw === userToken.raw;
      matched++;
      emit(exact || variant ? 'correct' : 'minor', userToken.raw, targetToken.raw, 'u' + userToken.rawIndex);
      if (!exact && !variant) {
        mistakes.push({ type: 'capitalization', word: userToken.norm, expected: targetToken.norm, message: 'Write "' + targetToken.raw + '" (capitalisation or punctuation).' });
      }
    } else if (op.op === 'missing') {
      const token = target[op.i];
      if (extraWords.includes(token.norm)) {
        emit('order', token.raw, token.raw);
        mistakes.push({ type: 'word_order', word: token.norm, expected: token.norm, message: 'The word "' + token.raw + '" is in the wrong position.' });
      } else {
        const info = classifyMissing(token.norm, target[op.i + 1]?.norm);
        emit('missing', token.raw, token.raw);
        mistakes.push({ ...info, word: token.norm, expected: token.norm });
      }
    } else if (op.op === 'extra') {
      if (missingWords.includes(user[op.j].norm)) continue;
      emit('extra', user[op.j].raw, null);
      mistakes.push({ type: 'extra_word', word: user[op.j].norm, expected: null, message: 'The word "' + user[op.j].raw + '" does not belong in this sentence.' });
    } else {
      const info = classifySubstitution(target[op.i].norm, user[op.j].norm);
      emit(info.type === 'spelling' ? 'spelling' : 'wrong', user[op.j].raw, target[op.i].raw);
      mistakes.push({ ...info, word: user[op.j].norm, expected: target[op.i].norm });
    }
  }

  const total = Math.max(target.length, user.length, 1);
  const penalty = mistakes.reduce((sum, m) => sum + (m.type === 'capitalization' ? 0.3 : isContentWord(m.expected || m.word || '') ? 1.2 : 0.8), 0);
  const correct = mistakes.length === 0;
  const score = correct ? 100 : Math.max(0, Math.min(97, Math.round(((total - penalty) / total) * 100)));

  return {
    score,
    correct,
    tokens,
    mistakes,
    matched,
    targetLength: target.length
  };
}

export function analyze(targetText, userText, alternatives = []) {
  const candidates = [targetText, ...alternatives];
  let best = null;
  let bestText = targetText;

  for (const candidate of candidates) {
    const result = compare(candidate, userText);
    if (!best || result.score > best.score) {
      best = result;
      bestText = candidate;
    }
    if (result.correct) break;
  }

  const advice = ADVICE.filter(([pattern]) => pattern.test(userText)).map(([, message]) => message).slice(0, 2);
  const mistakes = best.mistakes.map((mistake) => ({ ...mistake, explanation: EXPLANATIONS[mistake.type] || '' }));

  return {
    score: best.score,
    correct: best.correct,
    tokens: best.tokens,
    mistakes,
    advice,
    correction: bestText,
    alsoCorrect: bestText === targetText ? alternatives.slice(0, 2) : [targetText],
    summary: {
      words: best.targetLength,
      matched: best.matched,
      missing: mistakes.filter((m) => m.type.startsWith('missing')).length,
      grammar: mistakes.filter((m) => GRAMMAR_TYPES.has(m.type)).length,
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
