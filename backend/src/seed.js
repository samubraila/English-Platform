import { db } from './db.js';
import itEnglish from './data/it-english.js';
import generalEnglish from './data/general-english.js';
import phrases from './data/phrases.js';

const CATEGORIES = [
  ['it', 'IT English', '🖥', 10],
  ['support', 'Customer Support', '🎧', 20],
  ['docker', 'Docker', '🐳', 30],
  ['linux', 'Linux', '🐧', 40],
  ['networking', 'Networking', '🌐', 50],
  ['servers', 'Servers', '🗄', 60],
  ['monitoring', 'Monitoring', '📈', 70],
  ['security', 'Cybersecurity', '🔒', 80],
  ['programming', 'Programming', '⌨', 90],
  ['business', 'Business English', '💼', 100],
  ['email', 'Emails', '✉', 110],
  ['meetings', 'Meetings', '🗓', 120],
  ['phrasal', 'Phrasal Verbs', '🔗', 130],
  ['smalltalk', 'Small Talk', '💬', 140],
  ['daily', 'Daily English', '☀', 150],
  ['travel', 'Travel', '✈', 160],
  ['technology', 'Technology', '🔌', 170],
  ['general', 'General English', '📘', 180]
];

export function seed() {
  const insertCategory = db.prepare(
    'INSERT INTO categories (slug, name, icon, sort) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(slug) DO UPDATE SET name = excluded.name, icon = excluded.icon, sort = excluded.sort'
  );
  const insertExercise = db.prepare(
    'INSERT INTO exercises (category_id, level, text, corrupted, alternatives, owner_id) ' +
      'VALUES ((SELECT id FROM categories WHERE slug = ?), ?, ?, ?, ?, NULL) ' +
      'ON CONFLICT(text) DO UPDATE SET level = excluded.level, corrupted = excluded.corrupted, alternatives = excluded.alternatives ' +
      'WHERE exercises.owner_id IS NULL'
  );

  db.transaction(() => {
    for (const [slug, name, icon, sort] of CATEGORIES) insertCategory.run(slug, name, icon, sort);
    for (const [slug, level, text, corrupted, alternatives] of [...itEnglish, ...generalEnglish, ...phrases]) {
      insertExercise.run(slug, level, text, corrupted, alternatives?.length ? JSON.stringify(alternatives) : null);
    }
  })();

  return db.prepare('SELECT COUNT(*) AS count FROM exercises WHERE owner_id IS NULL').get().count;
}
