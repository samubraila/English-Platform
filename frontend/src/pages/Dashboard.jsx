import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { MODES, mistakeLabel } from '../modes.js';

const minutes = (seconds) => Math.round((seconds || 0) / 60);

function Stat({ label, value, hint, children }) {
  return (
    <article className="card stat">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </article>
  );
}

export default function Dashboard({ onStart }) {
  const [progress, setProgress] = useState(null);
  const [mistakes, setMistakes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.progress(), api.mistakes(), api.categories()])
      .then(([progressData, mistakeData, categoryData]) => {
        setProgress(progressData);
        setMistakes(mistakeData.mistakes);
        setCategories(categoryData.categories);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="banner" role="alert">{error}</p>;

  if (!progress) {
    return (
      <div className="grid" aria-busy="true">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="card stack tight">
            <div className="skeleton" style={{ width: '50%' }} />
            <div className="skeleton" style={{ height: '28px' }} />
          </div>
        ))}
      </div>
    );
  }

  const goalPercent = Math.min(100, Math.round((progress.today.exercises / progress.today.goal) * 100));
  const recommended = [...categories].sort((a, b) => a.done / (a.exercises || 1) - b.done / (b.exercises || 1)).slice(0, 4);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Your English training at a glance.</p>
        </div>
        <button className="btn" type="button" onClick={() => onStart({ mode: 'first-letter' })}>
          Continue learning
        </button>
      </header>

      <section className="grid">
        <Stat label="Today" value={progress.today.exercises + ' / ' + progress.today.goal} hint="exercises">
          <div className="bar" role="progressbar" aria-valuenow={goalPercent} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: goalPercent + '%' }} />
          </div>
        </Stat>
        <Stat label="Current streak" value={progress.streak + (progress.streak === 1 ? ' day' : ' days')} hint="days in a row" />
        <Stat label="Accuracy" value={progress.accuracy + '%'} hint={progress.totals.answers + ' answers in total'} />
        <Stat label="Weak words" value={progress.weakWords} hint="words to repeat" />
        <Stat label="Learning time" value={minutes(progress.totals.seconds) + ' min'} hint={minutes(progress.today.seconds) + ' min today'} />
      </section>

      <section className="card stack">
        <div className="stack tight">
          <h2>Training modes</h2>
          <p className="muted">Pick how you want to practise right now.</p>
        </div>
        <div className="grid">
          {MODES.map((mode) => (
            <button key={mode.id} type="button" className="card stack tight" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onStart({ mode: mode.id })}>
              <h3>{mode.label}</h3>
              <span className="muted">{mode.description}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="practice">
        <section className="card stack">
          <h2>Recent mistakes</h2>
          {mistakes.length === 0 ? (
            <p className="muted">No mistakes recorded yet. Start an exercise to see your feedback here.</p>
          ) : (
            <ul className="mistake-list">
              {mistakes.slice(0, 6).map((mistake, index) => (
                <li className="mistake" key={index}>
                  <div className="stack tight">
                    <span className="type">{mistakeLabel(mistake.type)}</span>
                    <span>{mistake.message}</span>
                    <span className="muted">{mistake.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card stack">
          <h2>Recommended</h2>
          <div className="list">
            {recommended.map((category) => (
              <div className="row" key={category.slug}>
                <div className="stack tight">
                  <strong>{category.name}</strong>
                  <span className="muted">{category.done} / {category.exercises} solved</span>
                </div>
                <button className="btn quiet" type="button" onClick={() => onStart({ mode: 'first-letter', category: category.slug })}>
                  Train
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
