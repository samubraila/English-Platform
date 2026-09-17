const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const IRREGULAR = {
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
  have: ['has', 'had', 'having'],
  do: ['does', 'did', 'done', 'doing'],
  go: ['goes', 'went', 'gone', 'going'],
  run: ['runs', 'ran', 'run', 'running'],
  write: ['writes', 'wrote', 'written', 'writing'],
  send: ['sends', 'sent', 'sending'],
  make: ['makes', 'made', 'making'],
  take: ['takes', 'took', 'taken', 'taking'],
  get: ['gets', 'got', 'getting'],
  keep: ['keeps', 'kept', 'keeping'],
  lose: ['loses', 'lost', 'losing'],
  find: ['finds', 'found', 'finding'],
  read: ['reads', 'reading'],
  set: ['sets', 'setting'],
  put: ['puts', 'putting'],
  leave: ['leaves', 'left', 'leaving'],
  build: ['builds', 'built', 'building'],
  think: ['thinks', 'thought', 'thinking'],
  know: ['knows', 'knew', 'known', 'knowing']
};

const SETS = {
  article: ['a', 'an', 'the'],
  preposition: ['in', 'on', 'at', 'to', 'for', 'from', 'with', 'by', 'of', 'about', 'after', 'before'],
  auxiliary: ['is', 'are', 'was', 'were', 'has', 'have', 'had', 'does', 'do', 'did', 'will', 'would', 'can', 'could', 'should', 'must']
};

const endsWithConsonantY = (word) => word.length > 2 && word.endsWith('y') && !VOWELS.has(word[word.length - 2]);
const isShortCvc = (word) =>
  word.length > 2 &&
  !VOWELS.has(word[word.length - 1]) &&
  VOWELS.has(word[word.length - 2]) &&
  !VOWELS.has(word[word.length - 3]) &&
  !['w', 'x', 'y'].includes(word[word.length - 1]);

export function thirdPerson(word) {
  if (/(s|x|z|ch|sh|o)$/.test(word)) return word + 'es';
  if (endsWithConsonantY(word)) return word.slice(0, -1) + 'ies';
  return word + 's';
}

export function pastTense(word) {
  if (word.endsWith('e')) return word + 'd';
  if (endsWithConsonantY(word)) return word.slice(0, -1) + 'ied';
  if (isShortCvc(word)) return word + word[word.length - 1] + 'ed';
  return word + 'ed';
}

export function gerund(word) {
  if (word.endsWith('ie')) return word.slice(0, -2) + 'ying';
  if (word.endsWith('e') && !word.endsWith('ee')) return word.slice(0, -1) + 'ing';
  if (isShortCvc(word)) return word + word[word.length - 1] + 'ing';
  return word + 'ing';
}

export function plural(word) {
  if (/(s|x|z|ch|sh)$/.test(word)) return word + 'es';
  if (endsWithConsonantY(word)) return word.slice(0, -1) + 'ies';
  if (word.endsWith('f')) return word.slice(0, -1) + 'ves';
  return word + 's';
}

export function singular(word) {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (/(ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

const rebuilds = (base, word) =>
  thirdPerson(base) === word || pastTense(base) === word || gerund(base) === word || plural(base) === word;

function stemCandidates(word) {
  const list = [];
  if (word.endsWith('ied')) list.push(word.slice(0, -3) + 'y');
  if (word.endsWith('ies')) list.push(word.slice(0, -3) + 'y');
  for (const suffix of ['ing', 'ed', 'es', 's']) {
    if (!word.endsWith(suffix)) continue;
    const stem = word.slice(0, -suffix.length);
    list.push(stem, stem + 'e');
    if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) list.push(stem.slice(0, -1));
  }
  return list.filter((candidate) => candidate.length > 1);
}

export function baseForm(word) {
  for (const [base, forms] of Object.entries(IRREGULAR)) {
    if (word === base || forms.includes(word)) return base;
  }
  const candidates = stemCandidates(word);
  return candidates.find((candidate) => rebuilds(candidate, word)) || candidates[0] || word;
}

export function wordFamily(word) {
  const base = baseForm(word);
  const irregular = IRREGULAR[base];
  const family = irregular ? [base, ...irregular] : [base, thirdPerson(base), pastTense(base), gerund(base)];
  return [...new Set(family)].filter(Boolean);
}

export function closedSetOf(word) {
  for (const [name, list] of Object.entries(SETS)) {
    if (list.includes(word)) return { name, list };
  }
  return null;
}

export function distractors(word, count = 3, fallback = []) {
  const closed = closedSetOf(word);
  const pool = closed ? closed.list : [...wordFamily(word), plural(word), singular(word)];
  const picked = [];

  for (const candidate of pool) {
    if (picked.length >= count) break;
    if (candidate && candidate !== word && !picked.includes(candidate)) picked.push(candidate);
  }
  for (const candidate of fallback) {
    if (picked.length >= count) break;
    if (candidate && candidate !== word && !picked.includes(candidate)) picked.push(candidate);
  }
  return picked;
}
