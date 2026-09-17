import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Practice from './pages/Practice.jsx';
import Progress from './pages/Progress.jsx';
import WeakWords from './pages/WeakWords.jsx';

const ROUTES = [
  { path: 'dashboard', label: 'Dashboard', icon: '◎' },
  { path: 'practice', label: 'Practice', icon: '✎' },
  { path: 'progress', label: 'Progress', icon: '▲' },
  { path: 'words', label: 'Weak words', icon: '★' }
];

const currentRoute = () => {
  const path = window.location.hash.replace('#/', '').split('?')[0];
  return ROUTES.some((route) => route.path === path) ? path : 'dashboard';
};

function Nav({ route, className }) {
  return (
    <nav className={className} aria-label="Main">
      {ROUTES.map((item) => (
        <a key={item.path} href={'#/' + item.path} aria-current={route === item.path ? 'page' : undefined}>
          <span className="icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(currentRoute);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme);
  const [practiceIntent, setPracticeIntent] = useState(null);

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('wt-theme', theme);
  }, [theme]);

  const startPractice = useCallback((intent) => {
    setPracticeIntent(intent);
    window.location.hash = '#/practice';
  }, []);

  const signOut = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    window.location.hash = '#/dashboard';
  };

  if (loading) {
    return (
      <div className="auth">
        <div className="card stack" aria-busy="true">
          <div className="skeleton" style={{ width: '160px' }} />
          <div className="skeleton" />
          <div className="skeleton" style={{ width: '70%' }} />
        </div>
      </div>
    );
  }

  if (!user) return <Auth onAuthenticated={setUser} />;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span aria-hidden="true">W</span>
          WORDTRACE
        </div>
        <Nav route={route} className="nav" />
        <div className="sidebar-footer">
          <button type="button" className="btn ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <span title={user.email}>{user.email}</span>
          <button type="button" className="btn quiet" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="main fade-in" key={route}>
        {route === 'dashboard' && <Dashboard onStart={startPractice} />}
        {route === 'practice' && <Practice intent={practiceIntent} />}
        {route === 'progress' && <Progress />}
        {route === 'words' && <WeakWords onStart={startPractice} />}
      </main>

      <Nav route={route} className="bottom-nav" />
    </div>
  );
}
