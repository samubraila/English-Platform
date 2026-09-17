export const MODES = [
  { id: 'first-letter', label: 'First Letter Challenge', short: 'First letters', icon: '🔤', description: 'Rebuild the sentence from its first letters.' },
  { id: 'reconstruction', label: 'Sentence Reconstruction', short: 'Reconstruct', icon: '🧩', description: 'Put shuffled words into the right order.' },
  { id: 'missing-word', label: 'Missing Word', short: 'Missing word', icon: '🕳', description: 'Fill the gap with the correct word.' },
  { id: 'grammar', label: 'Grammar Challenge', short: 'Grammar', icon: '🛠', description: 'Find and fix the mistake in a sentence.' },
  { id: 'listening', label: 'Listening Challenge', short: 'Listening', icon: '🎧', description: 'Write down the sentence you hear.' },
  { id: 'speaking', label: 'Speaking Challenge', short: 'Speaking', icon: '🎙', description: 'Say the sentence out loud and let the browser check it.' }
];

export const plural = (count, one, many) => count + ' ' + (count === 1 ? one : many);

export const modeLabel = (id) => MODES.find((mode) => mode.id === id)?.label || id;

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
