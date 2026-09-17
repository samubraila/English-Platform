import { useEffect, useState } from 'react';
import { api } from '../api.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function Library({ onStart }) {
  const [exercises, setExercises] = useState(null);
  const [categories, setCategories] = useState([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('it');
  const [level, setLevel] = useState('B1');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.myExercises(), api.categories()])
      .then(([mine, data]) => {
        setExercises(mine.exercises);
        setCategories(data.categories);
      })
      .catch((err) => setError(err.message));
  }, []);

  const add = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const created = await api.createExercise({ text, category, level });
      setExercises([{ ...created, categoryName: categories.find((c) => c.slug === category)?.name || category }, ...exercises]);
      setText('');
      setSaved('Sentence added. It will appear in your exercises.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteExercise(id);
      setExercises(exercises.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>Library</h1>
          <p>Add your own sentences. They are mixed into all training modes.</p>
        </div>
        <button className="btn" type="button" onClick={() => onStart({ mode: 'first-letter' })}>Practise now</button>
      </header>

      <section className="card stack pad-lg">
        <h2>New sentence</h2>
        <form className="stack" onSubmit={add}>
          {error && <p className="banner" role="alert">{error}</p>}
          {saved && <p className="banner ok">{saved}</p>}
          <div className="field">
            <label htmlFor="sentence">English sentence</label>
            <textarea
              id="sentence"
              rows={2}
              maxLength={300}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="The deployment failed because the certificate had expired."
            />
            <span className="muted">At least four words. Write it exactly as it should be correct.</span>
          </div>
          <div className="row-wrap">
            <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: '230px' }}>
              {categories.map((item) => (
                <option key={item.slug} value={item.slug}>{item.icon} {item.name}</option>
              ))}
            </select>
            <select aria-label="Level" value={level} onChange={(e) => setLevel(e.target.value)} style={{ maxWidth: '130px' }}>
              {LEVELS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Add sentence'}</button>
          </div>
        </form>
      </section>

      <section className="card stack">
        <div className="spread">
          <h2>Your sentences</h2>
          <span className="muted">{exercises?.length ?? 0} saved</span>
        </div>
        {!exercises && <div className="skeleton" style={{ height: '60px' }} aria-busy="true" />}
        {exercises?.length === 0 && <p className="muted">Nothing here yet. Sentences from your job, your emails or your tickets work best.</p>}
        {exercises?.length > 0 && (
          <div className="list">
            {exercises.map((item) => (
              <div className="row" key={item.id}>
                <div className="stack tight grow">
                  <span>{item.text}</span>
                  <span className="muted">{item.categoryName} · {item.level}</span>
                </div>
                <button className="btn danger" type="button" onClick={() => remove(item.id)} aria-label={'Delete: ' + item.text}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
