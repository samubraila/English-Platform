import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function WeakWords({ onStart }) {
  const [words, setWords] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.weakWords().then((data) => setWords(data.words)).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="banner" role="alert">{error}</p>;
  if (!words) return <div className="card skeleton" style={{ height: '120px' }} aria-busy="true" />;

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>Weak words</h1>
          <p>Words you got wrong. They appear more often in your exercises.</p>
        </div>
        <button className="btn" type="button" onClick={() => onStart({ mode: 'first-letter' })}>Train them now</button>
      </header>

      {words.length === 0 ? (
        <section className="card stack center">
          <h2>Nothing to repeat</h2>
          <p className="muted">Solve a few exercises first. Every mistake is collected here automatically.</p>
        </section>
      ) : (
        <section className="card list">
          {words.map((item) => (
            <div className="row" key={item.word}>
              <div className="stack tight">
                <strong>{item.word}</strong>
                <span className="muted">{item.correct} correct · last seen {item.last_seen.slice(0, 10)}</span>
              </div>
              <span className="tag" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
                {item.mistakes} {item.mistakes === 1 ? 'mistake' : 'mistakes'}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
