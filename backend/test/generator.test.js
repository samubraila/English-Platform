import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'wordtrace-test-'));
process.env.DB_PATH = join(dir, 'test.db');

const { seed } = await import('../src/seed.js');
const { MODES, TYPES, buildCard, checkCard, isMode, supports } = await import('../src/generator.js');
const { words } = await import('../src/analyzer.js');
const { db } = await import('../src/db.js');

const seeded = seed();

const item = {
  id: 1,
  text: 'The Docker container automatically restarts after a failure.',
  corrupted: 'The Docker container automatically restart after a failure.',
  alternatives: null,
  level: 'B1',
  category: 'docker',
  category_name: 'Docker',
  icon: '🐳',
  owner_id: null
};

const plain = { ...item, corrupted: null };

test.after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test('the corpus is seeded', () => {
  assert.ok(seeded > 300);
});

test('every mode is registered with a label and a ui', () => {
  assert.ok(MODES.length >= 9);
  for (const mode of MODES) {
    assert.ok(TYPES[mode].label.length > 0);
    assert.ok(['text', 'choice'].includes(TYPES[mode].ui));
    assert.equal(isMode(mode), true);
  }
  assert.equal(isMode('nonsense'), false);
});

test('one sentence produces a card for every supported mode', () => {
  const built = MODES.filter((mode) => supports(item, mode)).map((mode) => buildCard(item, mode));
  assert.equal(built.length, MODES.length);
  for (const card of built) {
    assert.equal(card.id, item.id);
    assert.equal(card.categoryName, 'Docker');
    assert.ok(card.instruction.length > 0);
  }
});

test('first letter card shows one letter per word plus hints', () => {
  const card = buildCard(item, 'first-letter');
  assert.equal(card.letters.length, words(item.text).length);
  assert.equal(card.letters[0], 'T');
  assert.ok(Object.keys(card.hints).length > 0);
  assert.ok(card.hints.T.length > 0);
  assert.ok(!card.text);
});

test('reconstruction returns every word without final punctuation', () => {
  const card = buildCard(item, 'reconstruction');
  assert.equal(card.tokens.length, words(item.text).length);
  assert.ok(card.tokens.every((token) => !token.endsWith('.')));
  assert.deepEqual([...card.tokens].sort(), words(item.text).map((word) => word.replace(/[.,!?]$/, '')).sort());
});

test('cloze hides a content word and can be answered', () => {
  const card = buildCard(item, 'cloze');
  assert.ok(card.prompt.includes('_____'));
  assert.ok(Number.isInteger(card.gap));
  const expected = words(item.text)[card.gap];
  const result = checkCard(item, 'cloze', expected, card);
  assert.equal(result.correct, true);
  assert.equal(result.correction, item.text);
});

test('cloze does not always pick the same word', () => {
  const gaps = new Set(Array.from({ length: 25 }, () => buildCard(item, 'cloze').gap));
  assert.ok(gaps.size > 1);
});

test('multiple choice offers the answer among four options', () => {
  const card = buildCard(item, 'multiple-choice');
  assert.equal(card.ui, 'choice');
  assert.ok(card.options.length >= 2 && card.options.length <= 4);
  assert.equal(new Set(card.options).size, card.options.length);
  const expected = words(item.text)[card.gap].replace(/[.,!?]$/, '').toLowerCase();
  assert.ok(card.options.includes(expected));
  assert.equal(checkCard(item, 'multiple-choice', expected, card).correct, true);
});

test('a wrong choice is reported as a mistake', () => {
  const card = buildCard(item, 'multiple-choice');
  const expected = words(item.text)[card.gap].replace(/[.,!?]$/, '').toLowerCase();
  const wrong = card.options.find((option) => option !== expected);
  const result = checkCard(item, 'multiple-choice', wrong, card);
  assert.equal(result.correct, false);
  assert.ok(result.mistakes.length > 0);
});

test('spelling speaks a single word and checks only that word', () => {
  const card = buildCard(item, 'spelling');
  assert.ok(card.speak && !card.speak.includes(' '));
  assert.equal(card.wordCount, 1);
  assert.equal(checkCard(item, 'spelling', card.speak, card).correct, true);
});

test('missing word is stable for the same exercise', () => {
  assert.equal(buildCard(item, 'missing-word').gap, buildCard(item, 'missing-word').gap);
});

test('grammar needs a corrupted variant', () => {
  assert.equal(supports(item, 'grammar'), true);
  assert.equal(supports(plain, 'grammar'), false);
  const card = buildCard(item, 'grammar');
  assert.equal(card.prompt, item.corrupted);
  assert.equal(checkCard(item, 'grammar', item.text, card).correct, true);
});

test('listening and speaking carry the sentence to the browser voice', () => {
  assert.equal(buildCard(item, 'listening').speak, item.text);
  assert.equal(buildCard(item, 'speaking').speak, item.text);
});

test('a full sentence answer is checked against the whole sentence', () => {
  const result = checkCard(item, 'first-letter', 'The Docker container automatically restart after failure.', {});
  assert.equal(result.correct, false);
  assert.ok(result.mistakes.length >= 2);
  assert.equal(result.correction, item.text);
});

test('an invalid gap falls back instead of throwing', () => {
  const result = checkCard(item, 'cloze', 'restarts', { gap: 999 });
  assert.ok(result.correction === item.text);
});
