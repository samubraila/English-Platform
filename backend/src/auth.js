import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const TTL = '7d';
export const COOKIE = 'wt_session';

if (!SECRET || SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

export const hashPassword = (password) => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
export const signToken = (user) => jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: TTL });

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.COOKIE_SECURE === 'true',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
};

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Not signed in.' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.clearCookie(COOKIE, cookieOptions);
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

export function validateCredentials(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return { error: 'Please enter a valid email address.' };
  if (password.length < 8 || password.length > 200) return { error: 'The password must be at least 8 characters long.' };
  return { email, password };
}
