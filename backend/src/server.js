import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { seed } from './seed.js';
import authRoutes from './routes/auth.js';
import exerciseRoutes from './routes/exercises.js';
import progressRoutes from './routes/progress.js';

const app = express();
const port = Number.parseInt(process.env.PORT, 10) || 4000;
const origins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60 * 1000, limit: 240, standardHeaders: true, legacyHeaders: false }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Vary', 'Origin');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api', progressRoutes);

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const count = seed();
app.listen(port, () => console.log('WORDTRACE API on port ' + port + ' with ' + count + ' exercises'));
