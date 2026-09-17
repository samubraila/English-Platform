import { useState } from 'react';
import { api } from '../api.js';

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = mode === 'login' ? await api.login(email, password) : await api.register(email, password);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="card stack" onSubmit={submit}>
        <div className="brand">
          <span aria-hidden="true">W</span>
          WORDTRACE
        </div>
        <div className="stack tight">
          <h1>{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
          <p className="muted">Train English sentences, grammar and IT vocabulary.</p>
        </div>

        {error && <p className="banner" role="alert">{error}</p>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'register' && <span className="muted">At least 8 characters.</span>}
        </div>

        <button className="btn block" type="submit" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          className="btn ghost block"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'I need an account' : 'I already have an account'}
        </button>
      </form>
    </div>
  );
}
