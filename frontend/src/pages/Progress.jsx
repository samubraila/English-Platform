import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { mistakeLabel, modeLabel } from '../modes.js';

export default function Progress() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.statistics().then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="banner" role="alert">{error}</p>;
  if (!stats) return <div className="card skeleton" style={{ height: '120px' }} aria-busy="true" />;

  const maxExercises = Math.max(1, ...stats.days.map((day) => day.exercises));
  const totalMistakes = stats.mistakeTypes.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>Progress</h1>
          <p>Your last two weeks, your modes and your typical mistakes.</p>
        </div>
      </header>

      <section className="card stack">
        <h2>Exercises per day</h2>
        {stats.days.length === 0 ? (
          <p className="muted">No exercises solved yet.</p>
        ) : (
          <>
            <div className="sparkline" role="img" aria-label={'Exercises per day, highest value ' + maxExercises}>
              {stats.days.map((day) => (
                <div key={day.day} style={{ height: Math.max(6, (day.exercises / maxExercises) * 100) + '%' }} title={day.day + ': ' + day.exercises} />
              ))}
            </div>
            <div className="meta-row">
              <span>{stats.days[0].day}</span>
              <span>{stats.days[stats.days.length - 1].day}</span>
            </div>
          </>
        )}
      </section>

      <div className="practice">
        <section className="card stack">
          <h2>Mistake types</h2>
          {totalMistakes === 0 ? (
            <p className="muted">No mistakes recorded yet.</p>
          ) : (
            <div className="list">
              {stats.mistakeTypes.map((item) => (
                <div key={item.type} className="stack tight">
                  <div className="meta-row">
                    <strong>{mistakeLabel(item.type)}</strong>
                    <span>{item.count}</span>
                  </div>
                  <div className="bar">
                    <div style={{ width: Math.round((item.count / totalMistakes) * 100) + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card stack">
          <h2>Modes</h2>
          {stats.modes.length === 0 ? (
            <p className="muted">Nothing practised yet.</p>
          ) : (
            <div className="list">
              {stats.modes.map((item) => (
                <div className="row" key={item.mode}>
                  <div className="stack tight">
                    <strong>{modeLabel(item.mode)}</strong>
                    <span className="muted">{item.count} answers</span>
                  </div>
                  <span className="tag accent">{item.score}%</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card stack">
        <h2>Categories</h2>
        {stats.categories.length === 0 ? (
          <p className="muted">No category data yet.</p>
        ) : (
          <div className="list">
            {stats.categories.map((item) => (
              <div className="row" key={item.slug}>
                <div className="stack tight">
                  <strong>{item.name}</strong>
                  <span className="muted">{item.answers} answers</span>
                </div>
                <span className="tag">{item.score}%</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
