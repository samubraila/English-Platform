import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Practice from './pages/Practice.jsx';
import Progress from './pages/Progress.jsx';
import WeakWords from './pages/WeakWords.jsx';
import Library from './pages/Library.jsx';
import Settings from './pages/Settings.jsx';

const ROUTES = [
  { path: 'dashboard', label: 'Dashboard', icon: '◉' },
  { path: 'practice', label: 'Practice', icon: '✎' },
  { path: 'words', label: 'Weak words', icon: '★' },
  { path: 'progress', label: 'Progress', icon: '▤' },
  { path: 'library', label: 'Library', icon: '＋' },
  { path: 'settings', label: 'Settings', icon: '⚙' }
];

const MOBILE_ROUTES = ['dashboard', 'practice', 'words', 'progress', 'settings'];

const currentRoute = () => {
  const path = window.location.hash.replace('#/', '').split('?')[0];
  return ROUTES.some((route) => route.path === path) ? path : 'dashboard';
};

function Nav({ route, className, items, badge }) {
  return (
    <nav className={className} aria-label="Main">
      {items.map((item) => (
        <a key={item.path} href={'#/' + item.path} aria-current={route === item.path ? 'page' : undefined}>
          <span className="icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
          {item.path === 'practice' && badge > 0 && <span className="badge">{badge}</span>}
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
  const [intent, setIntent] = useState(null);
  const [dueReviews, setDueReviews] = useState(0);

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
    try {
      localStorage.setItem('wt-theme', theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  const refreshDue = useCallback(() => {
    if (!user) return;
    api.progress().then((data) => setDueReviews(data.dueReviews)).catch(() => setDueReviews(0));
  }, [user]);

  useEffect(refreshDue, [refreshDue, route]);

  const start = useCallback((next) => {
    setIntent({ ...next, at: Date.now() });
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
          <div className="skeleton" style={{ width: '150px', height: '20px' }} />
          <div className="skeleton" />
          <div className="skeleton" style={{ width: '65%' }} />
        </div>
      </div>
    );
  }

  if (!user) return <Auth onAuthenticated={setUser} />;

  const initial = user.email[0].toUpperCase();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark" aria-hidden="true">W</span>
          WORDTRACE
        </div>
        <Nav route={route} className="nav" items={ROUTES} badge={dueReviews} />
        <div className="sidebar-footer">
          <button type="button" className="btn ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
          </button>
          <div className="sidebar-user">
            <span className="avatar" aria-hidden="true">{initial}</span>
            <span title={user.email}>{user.email}</span>
          </div>
          <button type="button" className="btn quiet" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="brand">
            <span className="mark" aria-hidden="true">W</span>
            WORDTRACE
          </div>
          <button type="button" className="chip" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Switch theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>

        <div className="fade-in" key={route}>
          {route === 'dashboard' && <Dashboard onStart={start} />}
          {route === 'practice' && <Practice intent={intent} onReviewChange={setDueReviews} />}
          {route === 'words' && <WeakWords onStart={start} />}
          {route === 'progress' && <Progress />}
          {route === 'library' && <Library onStart={start} />}
          {route === 'settings' && <Settings user={user} onSignOut={signOut} theme={theme} onTheme={setTheme} />}
        </div>
      </main>

      <Nav route={route} className="bottom-nav" items={ROUTES.filter((item) => MOBILE_ROUTES.includes(item.path))} badge={dueReviews} />
    </div>
  );
}
