import { useEffect, useState } from 'react';

export default function Puzzle({ letters, hints = {} }) {
  const [active, setActive] = useState(null);

  useEffect(() => setActive(null), [letters]);

  const show = (letter) => hints[letter]?.length && setActive(letter);
  const examples = active ? hints[active] : null;

  return (
    <div className="stack tight">
      <div className="puzzle letters">
        {letters.map((letter, index) => (
          <button
            key={index}
            type="button"
            className={'letter' + (active === letter ? ' on' : '')}
            aria-pressed={active === letter}
            aria-label={'Example words starting with ' + letter}
            disabled={!hints[letter]?.length}
            onMouseEnter={() => show(letter)}
            onFocus={() => show(letter)}
            onClick={() => show(letter)}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="hint-strip" aria-live="polite">
        {examples ? (
          <>
            <span className="hint-letter">{active}</span>
            {examples.map((word) => (
              <span className="hint-word" key={word}>{word}</span>
            ))}
          </>
        ) : (
          <span className="muted">Point at a letter or tap it to see example words.</span>
        )}
      </div>
    </div>
  );
}
