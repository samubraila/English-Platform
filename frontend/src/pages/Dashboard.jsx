import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { MODES, mistakeLabel, plural } from '../modes.js';
import Ring from '../components/Ring.jsx';

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
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.progress(), api.mistakes(), api.categories()])
      .then(([progress, mistakes, categories]) => setData({ progress, mistakes: mistakes.mistakes, categories: categories.categories }))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="banner" role="alert">{error}</p>;

  if (!data) {
    return (
      <div className="stack" aria-busy="true">
        <div className="card" style={{ height: '150px' }} />
        <div className="grid">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="card stack tight">
              <div className="skeleton" style={{ width: '55%' }} />
              <div className="skeleton" style={{ height: '26px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { progress, mistakes, categories } = data;
  const goalPercent = Math.min(100, Math.round((progress.today.exercises / progress.today.goal) * 100));
  const started = progress.totals.answers > 0;
  const recommended = [...categories].sort((a, b) => a.done / (a.exercises || 1) - b.done / (b.exercises || 1)).slice(0, 6);

  return (
    <div className="stack loose">
      <section className="hero">
        <div className="hero-grid">
          <div className="stack tight grow">
            <span className="tag" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
              {progress.streak > 0 ? '🔥 ' + plural(progress.streak, 'day streak', 'days streak') : 'Start your streak today'}
            </span>
            <h1>{started ? 'Welcome back' : 'Welcome to WORDTRACE'}</h1>
            <p>
              {started
                ? progress.today.exercises + ' of ' + progress.today.goal + ' exercises done today. ' + (progress.dueReviews > 0 ? plural(progress.dueReviews, 'sentence is', 'sentences are') + ' waiting for a repeat.' : 'Keep going.')
                : 'Rebuild English sentences from their first letters and get a precise analysis of every mistake.'}
            </p>
            <div className="row-wrap" style={{ marginTop: '10px' }}>
              <button className="btn on-hero lg" type="button" onClick={() => onStart({ mode: 'first-letter' })}>
                {started ? 'Continue learning' : 'Start your first exercise'}
              </button>
              {progress.dueReviews > 0 && (
                <button className="btn ghost lg" style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }} type="button" onClick={() => onStart({ mode: 'first-letter', queue: 'review' })}>
                  Repeat {plural(progress.dueReviews, 'sentence', 'sentences')}
                </button>
              )}
            </div>
          </div>
          <Ring value={goalPercent} size={112} stroke={10} label={progress.today.exercises + '/' + progress.today.goal} onHero />
        </div>
      </section>

      <section className="grid">
        <Stat label="Today" value={progress.today.exercises + ' / ' + progress.today.goal} hint="exercises">
          <div className="bar" role="progressbar" aria-valuenow={goalPercent} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: goalPercent + '%' }} />
          </div>
        </Stat>
        <Stat label="Accuracy" value={progress.accuracy + '%'} hint={'last 20 answers: ' + progress.recentScore + '% · ' + plural(progress.totals.answers, 'answer', 'answers') + ' in total'} />
        <Stat label="Weak words" value={progress.weakWords} hint={progress.dueReviews > 0 ? plural(progress.dueReviews, 'sentence', 'sentences') + ' to repeat' : 'words to repeat'} />
        <Stat label="Learning time" value={minutes(progress.totals.seconds) + ' min'} hint={minutes(progress.today.seconds) + ' min today'} />
      </section>

      <section className="stack">
        <div className="spread">
          <h2>Training modes</h2>
          <span className="muted">Six ways to practise</span>
        </div>
        <div className="grid wide">
          {MODES.map((mode) => (
            <button key={mode.id} type="button" className="tile" onClick={() => onStart({ mode: mode.id })}>
              <span className="tile-icon" aria-hidden="true">{mode.icon}</span>
              <h3>{mode.label}</h3>
              <span className="muted">{mode.description}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="practice">
        <section className="card stack">
          <div className="spread">
            <h2>Recent mistakes</h2>
            {mistakes.length > 0 && <a href="#/words">All weak words</a>}
          </div>
          {mistakes.length === 0 ? (
            <p className="muted">No mistakes recorded yet. Every mistake you make is explained here and turned into a repeat exercise.</p>
          ) : (
            <ul className="mistake-list">
              {mistakes.slice(0, 5).map((mistake, index) => (
                <li className="mistake" key={index}>
                  <span className="type">{mistakeLabel(mistake.type)}</span>
                  <p>{mistake.message}</p>
                  <p className="why">{mistake.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card stack">
          <h2>Pick a topic</h2>
          <div className="list">
            {recommended.map((category) => (
              <div className="row" key={category.slug}>
                <div className="stack tight">
                  <strong>{category.icon} {category.name}</strong>
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
