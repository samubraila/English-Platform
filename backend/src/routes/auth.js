import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db.js';
import { COOKIE, cookieOptions, hashPassword, requireAuth, signToken, validateCredentials, verifyPassword } from '../auth.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' }
});

router.post('/register', limiter, async (req, res) => {
  const credentials = validateCredentials(req.body);
  if (credentials.error) return res.status(400).json({ error: credentials.error });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(credentials.email);
  if (exists) return res.status(409).json({ error: 'This email address is already registered.' });

  const hash = await hashPassword(credentials.password);
  const id = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(credentials.email, hash).lastInsertRowid;
  const user = { id, email: credentials.email };
  res.cookie(COOKIE, signToken(user), cookieOptions).status(201).json({ user });
});

router.post('/login', limiter, async (req, res) => {
  const credentials = validateCredentials(req.body);
  if (credentials.error) return res.status(400).json({ error: credentials.error });

  const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(credentials.email);
  if (!user) {
    await hashPassword(credentials.password);
    return res.status(401).json({ error: 'Email address or password is not correct.' });
  }
  if (!(await verifyPassword(credentials.password, user.password_hash))) {
    return res.status(401).json({ error: 'Email address or password is not correct.' });
  }

  res.cookie(COOKIE, signToken(user), cookieOptions).json({ user: { id: user.id, email: user.email } });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE, cookieOptions).json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
