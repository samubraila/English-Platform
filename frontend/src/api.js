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

export const api = {
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  categories: () => request('/exercises/categories'),
  next: (params) => request('/exercises/next?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()),
  answer: (id, body) => request('/exercises/' + id + '/answer', { method: 'POST', body }),
  progress: () => request('/progress'),
  statistics: () => request('/statistics'),
  weakWords: () => request('/weak-words'),
  mistakes: () => request('/mistakes')
};
