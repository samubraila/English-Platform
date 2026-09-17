import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { MODES } from '../modes.js';
import Feedback from '../components/Feedback.jsx';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function speak(text) {
  if (!('speechSynthesis' in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 0.92;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export default function Practice({ intent }) {
  const [mode, setMode] = useState(intent?.mode || 'first-letter');
  const [category, setCategory] = useState(intent?.category || '');
  const [level, setLevel] = useState('');
  const [categories, setCategories] = useState([]);
  const [exercise, setExercise] = useState(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [session, setSession] = useState({ answered: 0, correct: 0, score: 0 });
  const startedAt = useRef(Date.now());
  const answerField = useRef(null);

  useEffect(() => {
    api.categories().then((data) => setCategories(data.categories)).catch(() => setCategories([]));
  }, []);

  const load = useCallback(
    async (excludeId) => {
      setStatus('loading');
      setError('');
      setResult(null);
      setInput('');
      try {
        const data = await api.next({ mode, category, level, exclude: excludeId });
        setExercise(data);
        setStatus('ready');
        startedAt.current = Date.now();
        if (data.mode === 'listening' && data.speak) speak(data.speak);
        answerField.current?.focus();
      } catch (err) {
        setExercise(null);
        setError(err.message);
        setStatus('empty');
      }
    },
    [mode, category, level]
  );

  useEffect(() => {
    load();
  }, [load]);

  const check = async (event) => {
    event?.preventDefault();
    if (!exercise || !input.trim() || status === 'checking') return;
    setStatus('checking');
    try {
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      const data = await api.answer(exercise.id, { mode: exercise.mode, input, seconds });
      setResult(data);
      setStatus('done');
      setSession((prev) => ({
        answered: prev.answered + 1,
        correct: prev.correct + (data.correct ? 1 : 0),
        score: prev.score + data.score
      }));
    } catch (err) {
      setError(err.message);
      setStatus('ready');
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (status === 'done') load(exercise?.id);
      else check();
    }
  };

  const activeMode = MODES.find((item) => item.id === mode);
  const sessionAccuracy = session.answered ? Math.round(session.score / session.answered) : 0;

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>Practice</h1>
          <p>{activeMode?.description}</p>
        </div>
      </header>

      <div className="card stack tight">
        <div className="chip-row" role="group" aria-label="Training mode">
          {MODES.map((item) => (
            <button key={item.id} type="button" className="chip" aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>
              {item.short}
            </button>
          ))}
        </div>
        <div className="chip-row">
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: '220px' }}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>{item.name}</option>
            ))}
          </select>
          <select aria-label="Level" value={level} onChange={(e) => setLevel(e.target.value)} style={{ maxWidth: '140px' }}>
            <option value="">All levels</option>
            {LEVELS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="practice">
        <div className="stack">
          {status === 'loading' && (
            <div className="card stack" aria-busy="true">
              <div className="skeleton" style={{ width: '40%' }} />
              <div className="skeleton" style={{ height: '48px' }} />
              <div className="skeleton" style={{ height: '90px' }} />
            </div>
          )}

          {status === 'empty' && (
            <div className="card stack center">
              <h2>No exercises available</h2>
              <p className="muted">{error || 'Try another category or level.'}</p>
              <button className="btn" type="button" onClick={() => load()}>Try again</button>
            </div>
          )}

          {exercise && status !== 'loading' && status !== 'empty' && (
            <form className="card stack" onSubmit={check}>
              <div className="meta-row">
                <span className="tag accent">{exercise.categoryName}</span>
                <span className="tag">{exercise.level}</span>
                <span>{session.correct} / {session.answered} correct in this session</span>
              </div>

              <div className="stack tight">
                <h2>{exercise.instruction}</h2>
                {exercise.mode === 'first-letter' && <p className="puzzle">{exercise.prompt}</p>}
                {exercise.mode === 'reconstruction' && (
                  <div className="chip-row">
                    {exercise.tokens.map((token, index) => (
                      <span className="chip" key={index}>{token}</span>
                    ))}
                  </div>
                )}
                {(exercise.mode === 'missing-word' || exercise.mode === 'grammar') && <p className="puzzle sentence">{exercise.prompt}</p>}
                {exercise.mode === 'listening' && (
                  <button className="btn quiet" type="button" onClick={() => speak(exercise.speak)}>
                    ▶ Play sentence
                  </button>
                )}
              </div>

              {error && status !== 'empty' && <p className="banner" role="alert">{error}</p>}

              <div className="field">
                <label htmlFor="answer">{exercise.mode === 'missing-word' ? 'Missing word' : 'Your sentence'}</label>
                <textarea
                  id="answer"
                  ref={answerField}
                  className="answer"
                  rows={exercise.mode === 'missing-word' ? 1 : 3}
                  autoComplete="off"
                  autoCapitalize="sentences"
                  spellCheck="false"
                  value={input}
                  disabled={status === 'done'}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={exercise.mode === 'missing-word' ? 'Type the missing word...' : 'Type your sentence...'}
                />
                <span className="muted">
                  {exercise.mode === 'missing-word' ? 'One word' : exercise.wordCount + ' words'} · Enter to {status === 'done' ? 'continue' : 'check'}
                </span>
              </div>

              {status === 'done' ? (
                <button className="btn block" type="button" onClick={() => load(exercise.id)}>Next exercise</button>
              ) : (
                <button className="btn block" type="submit" disabled={status === 'checking' || !input.trim()}>
                  {status === 'checking' ? 'Checking your answer...' : 'Check answer'}
                </button>
              )}
            </form>
          )}

          {result && <Feedback result={result} />}
        </div>

        <aside className="card stack">
          <h2>This session</h2>
          <div className="stat">
            <span className="label">Average score</span>
            <span className="value">{sessionAccuracy}%</span>
            <div className="bar">
              <div style={{ width: sessionAccuracy + '%' }} />
            </div>
          </div>
          <div className="row">
            <span className="muted">Exercises</span>
            <strong>{session.answered}</strong>
          </div>
          <div className="row">
            <span className="muted">Fully correct</span>
            <strong>{session.correct}</strong>
          </div>
          <p className="muted">Your mistakes are stored and used to pick the next exercises.</p>
        </aside>
      </div>
    </div>
  );
}
