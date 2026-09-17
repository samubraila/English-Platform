const base = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(base + path, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}

const cache = new Map();

function cached(key, ttl, load) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.at < ttl) return entry.value;
  const value = load().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { at: Date.now(), value });
  return value;
}

export const api = {
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password } }),
  logout: () => {
    cache.clear();
    return request('/auth/logout', { method: 'POST' });
  },
  catalogue: () => cached('catalogue', 5 * 60 * 1000, () => request('/exercises/categories')),
  next: (params) => request('/exercises/next?' + new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()),
  answer: (id, body) => {
    cache.delete('progress');
    cache.delete('catalogue');
    return request('/exercises/' + id + '/answer', { method: 'POST', body });
  },
  progress: () => cached('progress', 30 * 1000, () => request('/progress')),
  settings: () => request('/settings'),
  saveSettings: (body) => {
    cache.delete('progress');
    return request('/settings', { method: 'PUT', body });
  },
  myExercises: () => request('/exercises/mine'),
  createExercise: (body) => {
    cache.delete('catalogue');
    return request('/exercises', { method: 'POST', body });
  },
  deleteExercise: (id) => {
    cache.delete('catalogue');
    return request('/exercises/' + id, { method: 'DELETE' });
  },
  exportUrl: base + '/export',
  statistics: () => request('/statistics'),
  weakWords: () => request('/weak-words'),
  mistakes: () => request('/mistakes')
};
