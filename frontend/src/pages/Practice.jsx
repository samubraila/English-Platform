import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { MODES, recognizer, speak } from '../modes.js';
import Feedback from '../components/Feedback.jsx';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function Practice({ intent, onReviewChange }) {
  const [mode, setMode] = useState(intent?.mode || 'first-letter');
  const [category, setCategory] = useState(intent?.category || '');
  const [level, setLevel] = useState('');
  const [queue, setQueue] = useState(intent?.queue || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [exercise, setExercise] = useState(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
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
        const data = await api.next({ mode, category, level, queue, exclude: excludeId });
        setExercise(data);
        setStatus('ready');
        startedAt.current = Date.now();
        onReviewChange?.(data.dueReviews ?? 0);
        if (data.mode === 'listening' && data.speak) speak(data.speak);
        window.requestAnimationFrame(() => answerField.current?.focus());
      } catch (err) {
        setExercise(null);
        setError(err.message);
        setStatus('empty');
      }
    },
    [mode, category, level, queue, onReviewChange]
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
      setSession((prev) => ({ answered: prev.answered + 1, correct: prev.correct + (data.correct ? 1 : 0), score: prev.score + data.score }));
    } catch (err) {
      setError(err.message);
      setStatus('ready');
    }
  };

  const listen = () => {
    const recognition = recognizer();
    if (!recognition) {
      setError('Speech recognition is not supported in this browser. Chrome or Edge work best.');
      return;
    }
    setListening(true);
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onerror = () => setError('I could not hear you. Please try again.');
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (status === 'done') load(exercise?.id);
      else check();
    }
  };

  const activeMode = MODES.find((item) => item.id === mode);
  const sessionScore = session.answered ? Math.round(session.score / session.answered) : 0;
  const filtersActive = Boolean(category || level || queue);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>{activeMode?.icon} {activeMode?.label}</h1>
          <p>{activeMode?.description}</p>
        </div>
        <button className="chip" type="button" aria-pressed={filtersOpen || filtersActive} onClick={() => setFiltersOpen(!filtersOpen)}>
          ⚙ Filters{filtersActive ? ' · on' : ''}
        </button>
      </header>

      <div className="chip-row" role="group" aria-label="Training mode">
        {MODES.map((item) => (
          <button key={item.id} type="button" className="chip" aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>
            <span aria-hidden="true">{item.icon}</span> {item.short}
          </button>
        ))}
      </div>

      {(filtersOpen || filtersActive) && (
        <div className="card flat row-wrap fade-in">
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: '230px' }}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>{item.icon} {item.name}</option>
            ))}
          </select>
          <select aria-label="Level" value={level} onChange={(e) => setLevel(e.target.value)} style={{ maxWidth: '150px' }}>
            <option value="">All levels</option>
            {LEVELS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button type="button" className="chip" aria-pressed={queue === 'review'} onClick={() => setQueue(queue === 'review' ? '' : 'review')}>
            ♻ Repeats only{exercise?.dueReviews ? ' (' + exercise.dueReviews + ')' : ''}
          </button>
          {filtersActive && (
            <button
              type="button"
              className="chip"
              onClick={() => {
                setCategory('');
                setLevel('');
                setQueue('');
              }}
            >
              Reset
            </button>
          )}
        </div>
      )}

      <div className="practice">
        <div className="stack">
          {status === 'loading' && (
            <div className="card stack" aria-busy="true">
              <div className="skeleton" style={{ width: '35%' }} />
              <div className="skeleton" style={{ height: '64px' }} />
              <div className="skeleton" style={{ height: '100px' }} />
            </div>
          )}

          {status === 'empty' && (
            <div className="card stack center pad-lg">
              <h2>No exercises available</h2>
              <p className="muted">{error || 'Try another category, level or mode.'}</p>
              <button className="btn" type="button" onClick={() => load()}>Try again</button>
            </div>
          )}

          {exercise && status !== 'loading' && status !== 'empty' && (
            <form className="card stack pad-lg" onSubmit={check}>
              <div className="row-wrap spread">
                <div className="row-wrap">
                  <span className="tag accent">{exercise.icon} {exercise.categoryName}</span>
                  <span className="tag">{exercise.level}</span>
                  {exercise.review && <span className="tag warn">Repeat</span>}
                  {exercise.custom && <span className="tag ok">Own sentence</span>}
                </div>
                <span className="muted">{session.correct} / {session.answered} correct</span>
              </div>

              <div className="stack tight">
                <h2>{exercise.instruction}</h2>
                {exercise.mode === 'first-letter' && <p className="puzzle">{exercise.prompt}</p>}
                {exercise.mode === 'reconstruction' && (
                  <div className="chip-row">
                    {exercise.tokens.map((token, index) => (
                      <span className="chip word" key={index}>{token}</span>
                    ))}
                  </div>
                )}
                {(exercise.mode === 'missing-word' || exercise.mode === 'grammar') && <p className="puzzle sentence">{exercise.prompt}</p>}
                {exercise.mode === 'speaking' && <p className="puzzle sentence quiet">{exercise.prompt}</p>}
                {(exercise.mode === 'listening' || exercise.mode === 'speaking') && (
                  <div className="row-wrap">
                    <button className="btn quiet" type="button" onClick={() => speak(exercise.speak)}>▶ Play sentence</button>
                    {exercise.mode === 'speaking' && (
                      <button className="btn quiet" type="button" onClick={listen} disabled={listening}>
                        {listening ? '● Listening...' : '🎙 Speak now'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {error && <p className="banner" role="alert">{error}</p>}

              <div className="field">
                <label htmlFor="answer">{exercise.mode === 'missing-word' ? 'Missing word' : 'Your sentence'}</label>
                <textarea
                  id="answer"
                  ref={answerField}
                  className="answer"
                  rows={exercise.mode === 'missing-word' ? 1 : 3}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  value={input}
                  disabled={status === 'done'}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={exercise.mode === 'missing-word' ? 'Type the missing word...' : 'Type your sentence...'}
                />
                <span className="muted">
                  {exercise.mode === 'missing-word' ? 'One word' : exercise.wordCount + ' words'} · <span className="kbd">Enter</span> to check, <span className="kbd">Shift</span> + <span className="kbd">Enter</span> for a new line
                </span>
              </div>

              {status !== 'done' && (
                <button className="btn block lg" type="submit" disabled={status === 'checking' || !input.trim()}>
                  {status === 'checking' ? 'Checking your answer...' : 'Check answer'}
                </button>
              )}
            </form>
          )}

          {result && <Feedback result={result} onNext={() => load(exercise?.id)} />}
        </div>

        <aside className="card stack">
          <h2>This session</h2>
          <div className="stat">
            <span className="label">Average score</span>
            <span className="value">{sessionScore}%</span>
            <div className="bar">
              <div style={{ width: sessionScore + '%' }} />
            </div>
          </div>
          <div className="list">
            <div className="row">
              <span className="muted">Exercises</span>
              <strong>{session.answered}</strong>
            </div>
            <div className="row">
              <span className="muted">Fully correct</span>
              <strong>{session.correct}</strong>
            </div>
            <div className="row">
              <span className="muted">Waiting for a repeat</span>
              <strong>{exercise?.dueReviews ?? 0}</strong>
            </div>
          </div>
          <p className="muted">Every mistake is stored per word. Sentences you get wrong come back until you get them right.</p>
        </aside>
      </div>
    </div>
  );
}
