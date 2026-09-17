import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { mistakeLabel, speak } from '../modes.js';

export default function WeakWords({ onStart }) {
  const [words, setWords] = useState(null);
  const [mistakes, setMistakes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.weakWords(), api.mistakes()])
      .then(([wordData, mistakeData]) => {
        setWords(wordData.words);
        setMistakes(mistakeData.mistakes);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="banner" role="alert">{error}</p>;
  if (!words) return <div className="card skeleton" style={{ height: '140px' }} aria-busy="true" />;

  return (
    <div className="stack loose">
      <header className="page-head">
        <div>
          <h1>Weak words</h1>
          <p>Words you got wrong. Sentences with these words come up more often.</p>
        </div>
        <button className="btn" type="button" onClick={() => onStart({ mode: 'first-letter', queue: 'review' })}>Repeat my mistakes</button>
      </header>

      {words.length === 0 ? (
        <section className="card stack center pad-lg">
          <h2>Nothing to repeat</h2>
          <p className="muted">Solve a few exercises first. Every mistake is collected here automatically.</p>
          <button className="btn" type="button" onClick={() => onStart({ mode: 'first-letter' })}>Start practising</button>
        </section>
      ) : (
        <div className="practice">
          <section className="card stack">
            <h2>Words</h2>
            <div className="list">
              {words.map((item) => (
                <div className="row" key={item.word}>
                  <div className="stack tight grow">
                    <div className="row-wrap">
                      <strong>{item.word}</strong>
                      <button className="chip" type="button" onClick={() => speak(item.word)} aria-label={'Listen to ' + item.word}>🔊</button>
                    </div>
                    <span className="muted">{item.correct} times correct · last seen {item.last_seen.slice(0, 10)}</span>
                  </div>
                  <span className={'tag ' + (item.mistakes > item.correct ? 'bad' : 'warn')}>
                    {item.mistakes} {item.mistakes === 1 ? 'mistake' : 'mistakes'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="card stack">
            <h2>Last mistakes</h2>
            {mistakes.length === 0 ? (
              <p className="muted">Nothing recorded yet.</p>
            ) : (
              <ul className="mistake-list">
                {mistakes.slice(0, 8).map((mistake, index) => (
                  <li className="mistake" key={index}>
                    <span className="type">{mistakeLabel(mistake.type)}</span>
                    <p>{mistake.message}</p>
                    <p className="why">{mistake.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
