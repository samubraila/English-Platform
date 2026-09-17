import { analyze, blankIndex, firstLetters, isContentWord, normalize, words } from './analyzer.js';
import { distractors } from './forms.js';
import { letterHints } from './hints.js';

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const parseAlternatives = (value) => {
  if (!value) return [];
  try {
    const list = JSON.parse(value);
    return Array.isArray(list) ? list.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const contentGaps = (text) =>
  words(text)
    .map((word, index) => [normalize(word), index])
    .filter(([word, index]) => index > 0 && isContentWord(word) && word.length > 3)
    .map(([, index]) => index);

export const wordAt = (text, gap) => words(text)[gap] || '';
export const cleanWord = (word) => normalize(word);

const withGap = (text, gap) =>
  words(text)
    .map((word, index) => (index === gap ? '_____' : word))
    .join(' ');

const checkFullSentence = (item, input) => analyze(item.text, input, parseAlternatives(item.alternatives));

function checkGap(item, gap, input) {
  const expected = wordAt(item.text, gap);
  const result = analyze(cleanWord(expected), cleanWord(input));
  result.correction = item.text;
  result.expected = expected;
  result.gapSentence = withGap(item.text, gap);
  return result;
}

function fallbackWords(item, word) {
  const letter = (word[0] || '').toUpperCase();
  const hints = letterHints([letter], item.category);
  return (hints[letter] || []).filter((candidate) => candidate !== word && Math.abs(candidate.length - word.length) <= 3);
}

export const TYPES = {
  'first-letter': {
    label: 'First Letter Challenge',
    ui: 'text',
    build: (item) => {
      const letters = firstLetters(item.text).split(' ');
      return {
        prompt: letters.join(' '),
        letters,
        hints: letterHints(letters, item.category),
        instruction: 'Write the full sentence behind these first letters.'
      };
    },
    check: checkFullSentence
  },

  reconstruction: {
    label: 'Sentence Reconstruction',
    ui: 'text',
    build: (item) => ({
      tokens: shuffle(words(item.text).map((word) => word.replace(/[.,!?]$/, ''))),
      instruction: 'Put the words into the correct order.'
    }),
    check: checkFullSentence
  },

  'missing-word': {
    label: 'Missing Word',
    ui: 'text',
    build: (item) => {
      const gap = blankIndex(item.text, item.id);
      return { prompt: withGap(item.text, gap), gap, wordCount: 1, instruction: 'Fill in the missing word.' };
    },
    check: (item, input, card) => checkGap(item, card.gap, input)
  },

  cloze: {
    label: 'Cloze',
    ui: 'text',
    supports: (item) => contentGaps(item.text).length > 0,
    build: (item) => {
      const candidates = contentGaps(item.text);
      const gap = candidates[Math.floor(Math.random() * candidates.length)];
      return { prompt: withGap(item.text, gap), gap, wordCount: 1, instruction: 'Complete the sentence with the missing word.' };
    },
    check: (item, input, card) => checkGap(item, card.gap, input)
  },

  'multiple-choice': {
    label: 'Multiple Choice',
    ui: 'choice',
    supports: (item) => contentGaps(item.text).length > 0,
    build: (item) => {
      const candidates = contentGaps(item.text);
      const gap = candidates[Math.floor(Math.random() * candidates.length)];
      const answer = cleanWord(wordAt(item.text, gap));
      const options = shuffle([answer, ...distractors(answer, 3, fallbackWords(item, answer))]);
      return { prompt: withGap(item.text, gap), gap, options, wordCount: 1, instruction: 'Choose the word that fits.' };
    },
    check: (item, input, card) => checkGap(item, card.gap, input)
  },

  spelling: {
    label: 'Spelling',
    ui: 'text',
    supports: (item) => contentGaps(item.text).length > 0,
    build: (item) => {
      const candidates = contentGaps(item.text);
      const gap = candidates[Math.floor(Math.random() * candidates.length)];
      return {
        gap,
        speak: cleanWord(wordAt(item.text, gap)),
        wordCount: 1,
        instruction: 'Listen to the word and write it correctly.'
      };
    },
    check: (item, input, card) => checkGap(item, card.gap, input)
  },

  grammar: {
    label: 'Grammar Challenge',
    ui: 'text',
    supports: (item) => Boolean(item.corrupted),
    build: (item) => ({ prompt: item.corrupted, instruction: 'This sentence contains one mistake. Write the correct version.' }),
    check: checkFullSentence
  },

  listening: {
    label: 'Listening Challenge',
    ui: 'text',
    build: (item) => ({ speak: item.text, instruction: 'Listen and write down what you hear.' }),
    check: checkFullSentence
  },

  speaking: {
    label: 'Speaking Challenge',
    ui: 'text',
    build: (item) => ({ prompt: item.text, speak: item.text, instruction: 'Read the sentence out loud.' }),
    check: checkFullSentence
  }
};

export const MODES = Object.keys(TYPES);
export const isMode = (mode) => Object.hasOwn(TYPES, mode);
export const supports = (item, mode) => isMode(mode) && (!TYPES[mode].supports || TYPES[mode].supports(item));

export function buildCard(item, mode, extra = {}) {
  const type = TYPES[mode];
  return {
    id: item.id,
    mode,
    ui: type.ui,
    level: item.level,
    category: item.category,
    categoryName: item.category_name,
    icon: item.icon,
    wordCount: words(item.text).length,
    custom: Boolean(item.owner_id),
    ...type.build(item),
    ...extra
  };
}

export function checkCard(item, mode, input, card = {}) {
  const gap = Number.isInteger(card.gap) && card.gap >= 0 && card.gap < words(item.text).length ? card.gap : blankIndex(item.text, item.id);
  return TYPES[mode].check(item, input, { gap });
}

export const gapWord = (item, card) =>
  Number.isInteger(card?.gap) && card.gap >= 0 && card.gap < words(item.text).length ? cleanWord(wordAt(item.text, card.gap)) : null;
