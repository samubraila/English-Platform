const META = {
  'first-letter': { short: 'First letters', icon: '🔤', description: 'Rebuild the sentence from its first letters.' },
  reconstruction: { short: 'Reconstruct', icon: '🧩', description: 'Put shuffled words into the right order.' },
  cloze: { short: 'Cloze', icon: '🧠', description: 'Complete the sentence with the missing key word.' },
  'missing-word': { short: 'Missing word', icon: '🕳', description: 'Fill the gap with the correct function word.' },
  'multiple-choice': { short: 'Choice', icon: '🔘', description: 'Pick the form that fits the sentence.' },
  spelling: { short: 'Spelling', icon: '🔡', description: 'Listen to a word and write it correctly.' },
  grammar: { short: 'Grammar', icon: '🛠', description: 'Find and fix the mistake in a sentence.' },
  listening: { short: 'Listening', icon: '🎧', description: 'Write down the sentence you hear.' },
  speaking: { short: 'Speaking', icon: '🎙', description: 'Say the sentence out loud and let the browser check it.' }
};

const FALLBACK = Object.keys(META).map((id) => ({ id, label: id, ui: 'text' }));

export const withMeta = (modes) =>
  (modes?.length ? modes : FALLBACK).map((mode) => ({ ...META[mode.id], label: mode.label, ...mode }));

export const modeLabel = (id) => META[id]?.short || id;
export const modeIcon = (id) => META[id]?.icon || '•';

const MISTAKE_LABELS = {
  missing_word: 'Missing word',
  missing_article: 'Missing article',
  missing_to: 'Missing "to"',
  missing_auxiliary: 'Missing verb form',
  missing_preposition: 'Missing preposition',
  wrong_word: 'Wrong word',
  wrong_article: 'Wrong article',
  wrong_tense: 'Wrong verb form',
  wrong_preposition: 'Wrong preposition',
  number: 'Singular / plural',
  spelling: 'Spelling',
  word_order: 'Word order',
  extra_word: 'Extra word',
  capitalization: 'Capitalisation'
};

export const mistakeLabel = (type) => MISTAKE_LABELS[type] || type;
export const plural = (count, one, many) => count + ' ' + (count === 1 ? one : many);

export const speak = (text) => {
  if (!('speechSynthesis' in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 0.92;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
};

export const recognizer = () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return null;
  const recognition = new Recognition();
  recognition.lang = 'en-GB';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
};
