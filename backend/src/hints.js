import { db } from './db.js';
import { normalize, words } from './analyzer.js';

let index = null;
let indexedCount = -1;

function build() {
  const rows = db.prepare('SELECT e.text, c.slug FROM exercises e JOIN categories c ON c.id = e.category_id WHERE e.owner_id IS NULL').all();
  const global = new Map();
  const byCategory = new Map();

  const count = (target, letter, word) => {
    if (!target.has(letter)) target.set(letter, new Map());
    const bucket = target.get(letter);
    bucket.set(word, (bucket.get(word) || 0) + 1);
  };

  for (const row of rows) {
    if (!byCategory.has(row.slug)) byCategory.set(row.slug, new Map());
    for (const raw of words(row.text)) {
      const word = normalize(raw);
      if (!word) continue;
      const letter = word[0].toUpperCase();
      count(global, letter, word);
      count(byCategory.get(row.slug), letter, word);
    }
  }

  const rank = (source) => {
    const ranked = new Map();
    for (const [letter, bucket] of source) {
      ranked.set(letter, [...bucket.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([word]) => word));
    }
    return ranked;
  };

  index = { global: rank(global), byCategory: new Map([...byCategory].map(([slug, source]) => [slug, rank(source)])) };
  indexedCount = rows.length;
}

const display = (word) => (word === 'i' ? 'I' : word);

export function letterHints(letters, category, perLetter = 6) {
  const total = db.prepare('SELECT COUNT(*) AS count FROM exercises WHERE owner_id IS NULL').get().count;
  if (!index || total !== indexedCount) build();

  const local = index.byCategory.get(category) || new Map();
  const hints = {};

  for (const letter of new Set(letters)) {
    const picked = [];
    const fill = (source, max) => {
      for (const word of source) {
        if (picked.length >= max) break;
        if (!picked.includes(word)) picked.push(word);
      }
    };
    fill(local.get(letter) || [], Math.ceil(perLetter / 2));
    fill(index.global.get(letter) || [], perLetter);
    if (picked.length) hints[letter] = picked.map(display);
  }

  return hints;
}
