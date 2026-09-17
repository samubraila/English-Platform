export const MODES = [
  { id: 'first-letter', label: 'First Letter Challenge', short: 'First letters', description: 'Rebuild the sentence from its first letters.' },
  { id: 'reconstruction', label: 'Sentence Reconstruction', short: 'Reconstruct', description: 'Put shuffled words into the right order.' },
  { id: 'missing-word', label: 'Missing Word', short: 'Missing word', description: 'Fill the gap with the correct word.' },
  { id: 'grammar', label: 'Grammar Challenge', short: 'Grammar', description: 'Find and fix the mistake in a sentence.' },
  { id: 'listening', label: 'Listening Challenge', short: 'Listening', description: 'Write down the sentence you hear.' }
];

export const modeLabel = (id) => MODES.find((mode) => mode.id === id)?.label || id;

export const MISTAKE_LABELS = {
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
