import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, blankIndex, contentWords, firstLetters, levenshtein, normalize, words } from '../src/analyzer.js';

test('tokenisation keeps words and strips punctuation on normalisation', () => {
  assert.deepEqual(words('The server is  running.'), ['The', 'server', 'is', 'running.']);
  assert.equal(normalize('Running.'), 'running');
  assert.equal(normalize('"quoted"'), 'quoted');
  assert.equal(normalize("it's"), "it's");
});

test('first letters keep one letter per word', () => {
  assert.equal(firstLetters('I need to configure the server.'), 'I N T C T S');
  assert.equal(firstLetters('The Docker container restarts.').split(' ').length, 4);
});

test('levenshtein counts single edits', () => {
  assert.equal(levenshtein('server', 'server'), 0);
  assert.equal(levenshtein('server', 'serve'), 1);
  assert.equal(levenshtein('software', 'sofware'), 1);
  assert.equal(levenshtein('whether', 'wether'), 1);
});

test('a perfect answer scores 100', () => {
  const sentence = 'The monitoring server is currently offline.';
  const result = analyze(sentence, sentence);
  assert.equal(result.score, 100);
  assert.equal(result.correct, true);
  assert.deepEqual(result.mistakes, []);
});

test('missing words are found and classified', () => {
  const result = analyze('I need to restart the Docker container because it is not responding.', 'I need restart Docker container because it not responding.');
  const types = result.mistakes.map((mistake) => mistake.type);
  assert.deepEqual(types, ['missing_to', 'missing_article', 'missing_auxiliary']);
  assert.ok(result.score > 0 && result.score < 100);
  assert.ok(result.mistakes.every((mistake) => mistake.explanation.length > 0));
});

test('a missing auxiliary is reported', () => {
  const result = analyze('The monitoring server is currently offline.', 'The monitoring server currently offline.');
  assert.equal(result.mistakes.length, 1);
  assert.equal(result.mistakes[0].type, 'missing_auxiliary');
  assert.equal(result.mistakes[0].expected, 'is');
  assert.ok(result.tokens.some((token) => token.status === 'missing' && token.word === 'is'));
});

test('contractions are accepted in both directions', () => {
  const sentence = 'We cannot reproduce the error because it is not responding.';
  assert.equal(analyze(sentence, "We can't reproduce the error because it's not responding.").correct, true);
  assert.equal(analyze("We can't reproduce it.", 'We can not reproduce it.').correct, true);
});

test('british and american spelling both count as correct', () => {
  assert.equal(analyze('We organise the backup.', 'We organize the backup.').correct, true);
});

test('alternative formulations are accepted', () => {
  const target = 'I need to configure the server.';
  const result = analyze(target, 'I have to configure the server.', ['I have to configure the server.']);
  assert.equal(result.correct, true);
  assert.equal(result.correction, 'I have to configure the server.');
});

test('word order mistakes are separated from missing words', () => {
  const result = analyze('The server restarted automatically yesterday.', 'The server automatically restarted yesterday.');
  assert.deepEqual(result.mistakes.map((mistake) => mistake.type), ['word_order']);
});

test('spelling mistakes are detected instead of wrong words', () => {
  const result = analyze('Please check whether the software is up to date.', 'Please check wether the sofware is up to date.');
  assert.deepEqual(result.mistakes.map((mistake) => mistake.type), ['spelling', 'spelling']);
});

test('singular and plural are reported as a number mistake', () => {
  const result = analyze('after five failed login attempts', 'after five failed login attempt');
  assert.equal(result.mistakes[0].type, 'number');
  assert.equal(result.mistakes[0].expected, 'attempts');
});

test('capitalisation is a minor mistake and keeps the score high', () => {
  const result = analyze('The account was locked.', 'the account was locked.');
  assert.equal(result.mistakes[0].type, 'capitalization');
  assert.ok(result.score >= 85);
});

test('extra words are reported', () => {
  const result = analyze('The server is offline.', 'The server is really offline.');
  assert.deepEqual(result.mistakes.map((mistake) => mistake.type), ['extra_word']);
});

test('learner patterns are detected independently of the target', () => {
  const result = analyze('I have been living here for three years.', 'I am living here since three years.');
  assert.ok(result.advice.some((tip) => tip.includes('"for"')));
});

test('gap index points at a function word', () => {
  const sentence = 'The virtual machine does not have enough memory.';
  const index = blankIndex(sentence, 1);
  assert.ok(index > 0 && index < words(sentence).length);
});

test('content words skip stopwords', () => {
  const list = contentWords('The server is not running at the moment.');
  assert.ok(list.includes('server'));
  assert.ok(list.includes('running'));
  assert.ok(!list.includes('the'));
  assert.ok(!list.includes('not'));
});
