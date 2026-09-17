import test from 'node:test';
import assert from 'node:assert/strict';
import { baseForm, distractors, gerund, pastTense, plural, singular, thirdPerson, wordFamily } from '../src/forms.js';

test('third person follows the spelling rules', () => {
  assert.equal(thirdPerson('restart'), 'restarts');
  assert.equal(thirdPerson('watch'), 'watches');
  assert.equal(thirdPerson('fix'), 'fixes');
  assert.equal(thirdPerson('try'), 'tries');
  assert.equal(thirdPerson('play'), 'plays');
});

test('past tense follows the spelling rules', () => {
  assert.equal(pastTense('restart'), 'restarted');
  assert.equal(pastTense('configure'), 'configured');
  assert.equal(pastTense('try'), 'tried');
  assert.equal(pastTense('stop'), 'stopped');
});

test('gerund follows the spelling rules', () => {
  assert.equal(gerund('restart'), 'restarting');
  assert.equal(gerund('configure'), 'configuring');
  assert.equal(gerund('run'), 'running');
  assert.equal(gerund('see'), 'seeing');
});

test('plural and singular are inverse for regular nouns', () => {
  assert.equal(plural('server'), 'servers');
  assert.equal(plural('box'), 'boxes');
  assert.equal(plural('company'), 'companies');
  assert.equal(singular('servers'), 'server');
  assert.equal(singular('companies'), 'company');
  assert.equal(singular('boxes'), 'box');
});

test('base form is found for regular and irregular verbs', () => {
  assert.equal(baseForm('restarts'), 'restart');
  assert.equal(baseForm('restarting'), 'restart');
  assert.equal(baseForm('tried'), 'try');
  assert.equal(baseForm('running'), 'run');
  assert.equal(baseForm('was'), 'be');
  assert.equal(baseForm('written'), 'write');
});

test('word family contains the four verb forms', () => {
  const family = wordFamily('configured');
  assert.ok(family.includes('configure'));
  assert.ok(family.includes('configures'));
  assert.ok(family.includes('configuring'));
});

test('distractors never contain the answer and are unique', () => {
  const options = distractors('restarts', 3);
  assert.equal(options.length, 3);
  assert.ok(!options.includes('restarts'));
  assert.equal(new Set(options).size, options.length);
});

test('closed word sets produce distractors from the same set', () => {
  assert.ok(distractors('the', 2).every((option) => ['a', 'an'].includes(option)));
  assert.ok(distractors('is', 3).every((option) => option !== 'is'));
});

test('fallback words fill up rare words', () => {
  const options = distractors('gateway', 3, ['gatekeeper', 'garbage', 'gadget']);
  assert.equal(options.length, 3);
  assert.ok(!options.includes('gateway'));
});
