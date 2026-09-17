# WORDTRACE

English training platform for sentence reconstruction, grammar and IT English.
The app shows only the first letters of a sentence, you write the full sentence, and the
analyzer explains exactly what was missing, wrong or misspelled.

```
I N T C T S B T C A T
-> I need to configure the server before the customer arrives tomorrow.
```

## Start

```bash
cp .env.example .env
# set JWT_SECRET to a random string with at least 32 characters
docker compose up -d
```

App: http://localhost:8080 — register an account and start practising.

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Training modes

| Mode | What you do |
| --- | --- |
| First Letter Challenge | Rebuild a sentence from `T D C A R A T S R` |
| Sentence Reconstruction | Put shuffled words into the correct order |
| Missing Word | Fill a gap with the correct word |
| Grammar Challenge | Find and correct the mistake in a sentence |
| Listening Challenge | Write down the sentence the browser reads out |

The IT scenario mode from the concept is not implemented yet — free answers need a language
model, which is planned for phase 4.

## Error analysis

Every answer is aligned word by word against the original sentence. The analyzer reports
missing words, extra words, wrong word order, wrong articles, missing `to`, missing verb
forms, wrong prepositions, singular/plural mistakes, spelling and capitalisation, plus the
fully corrected sentence.

Mistakes are stored per word. Words with more mistakes than correct uses become *weak words*
and are preferred when the next exercise is picked.

## Stack

- **backend** Node 20, Express, SQLite (better-sqlite3), JWT in an httpOnly cookie
- **frontend** React 18, Vite, plain CSS, no UI framework
- **docker** two containers, one named volume, no separate database service

```
backend/src
  server.js        express app, security middleware, routes
  analyzer.js      sentence alignment and mistake classification
  db.js            sqlite connection, schema bootstrap
  seed.js          categories and 108 sentences
  auth.js          hashing, tokens, auth middleware
  routes/          auth, exercises, progress
frontend/src
  App.jsx          shell, navigation, theme
  pages/           Auth, Dashboard, Practice, Progress, WeakWords
  components/      Feedback
```

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | create an account |
| POST | `/api/auth/login` | sign in (rate limited) |
| POST | `/api/auth/logout` | clear the session cookie |
| GET | `/api/auth/me` | current user |
| GET | `/api/exercises/categories` | categories, levels, modes |
| GET | `/api/exercises/next` | next exercise (`mode`, `category`, `level`, `exclude`) |
| GET | `/api/exercises/:id` | one exercise |
| POST | `/api/exercises/:id/answer` | check an answer and store the mistakes |
| GET | `/api/progress` | today, streak, accuracy, weak word count |
| GET | `/api/statistics` | last 14 days, mistake types, modes, categories |
| GET | `/api/weak-words` | words to repeat |
| GET | `/api/mistakes` | last mistakes with the original sentence |

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `JWT_SECRET` | – | required, at least 32 characters |
| `APP_PORT` | `8080` | host port of the web app |
| `DAILY_GOAL` | `20` | exercises per day on the dashboard |
| `COOKIE_SECURE` | `false` | set to `true` when serving over HTTPS |
| `CORS_ORIGIN` | empty | comma separated origins, only needed for a split deployment |

Data lives in the `wordtrace-data` volume. `docker compose down -v` deletes all accounts and
progress.

## Development

```bash
cd backend  && npm install && JWT_SECRET=dev_secret_at_least_32_characters_long npm run dev
cd frontend && npm install && npm run dev
```

Vite serves on http://localhost:5173 and proxies `/api` to the backend on port 4000.

## Adding exercises

Add a row to `EXERCISES` in `backend/src/seed.js`:

```js
['docker', 'B2', 'The container exposes port eight thousand to the host.', null]
```

The fourth field is an optional wrong version used by the Grammar Challenge. Seeding is
idempotent, so new sentences are added on the next start without touching existing data.
