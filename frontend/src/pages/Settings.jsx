import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings({ user, onSignOut, theme, onTheme }) {
  const [settings, setSettings] = useState(null);
  const [goal, setGoal] = useState(20);
  const [level, setLevel] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .settings()
      .then((data) => {
        setSettings(data);
        setGoal(data.daily_goal);
        setLevel(data.level || '');
      })
      .catch((err) => setError(err.message));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.saveSettings({ daily_goal: Number(goal), level: level || null });
      setMessage('Saved.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Your daily goal, your level and your data.</p>
        </div>
      </header>

      <section className="card stack pad-lg">
        <h2>Learning</h2>
        {error && <p className="banner" role="alert">{error}</p>}
        {message && <p className="banner ok">{message}</p>}
        <form className="stack" onSubmit={save}>
          <div className="field">
            <label htmlFor="goal">Daily goal</label>
            <input id="goal" type="number" min={5} max={200} value={goal} onChange={(e) => setGoal(e.target.value)} style={{ maxWidth: '160px' }} />
            <span className="muted">Exercises per day shown on the dashboard.</span>
          </div>
          <div className="field">
            <label htmlFor="level">Preferred level</label>
            <select id="level" value={level} onChange={(e) => setLevel(e.target.value)} style={{ maxWidth: '200px' }}>
              <option value="">All levels</option>
              {(settings?.levels || []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <button className="btn" type="submit" style={{ alignSelf: 'flex-start' }}>Save</button>
        </form>
      </section>

      <section className="card stack">
        <h2>Appearance</h2>
        <div className="chip-row">
          <button type="button" className="chip" aria-pressed={theme === 'light'} onClick={() => onTheme('light')}>☀ Light</button>
          <button type="button" className="chip" aria-pressed={theme === 'dark'} onClick={() => onTheme('dark')}>☾ Dark</button>
        </div>
      </section>

      <section className="card stack">
        <h2>Account</h2>
        <div className="list">
          <div className="row">
            <span className="muted">Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="row">
            <span className="muted">Member since</span>
            <strong>{settings?.created_at?.slice(0, 10) || '—'}</strong>
          </div>
        </div>
        <div className="row-wrap">
          <a className="btn quiet" href={api.exportUrl} download>⬇ Export my data</a>
          <button className="btn danger" type="button" onClick={onSignOut}>Sign out</button>
        </div>
        <p className="muted">The export contains your progress, your answers and your weak words as JSON.</p>
      </section>
    </div>
  );
}
