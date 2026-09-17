# WORDTRACE

English training platform for sentence reconstruction, grammar and IT English.
The app shows only the first letters of a sentence, you write the full sentence, and the
analyzer explains exactly what was missing, wrong or misspelled — and why.

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
| Speaking Challenge | Say the sentence out loud, speech recognition checks it |

343 sentences in 18 categories, from A1 to C1, with a clear focus on IT: Docker, Linux,
networking, servers, monitoring, security, programming and customer support. You can add your
own sentences in the library; they are mixed into every mode.

The IT scenario mode from the concept is not implemented — free answers to an open situation
need a language model. Everything else is rule based and runs offline.

## Error analysis

Every answer is aligned word by word against the original sentence. The analyzer reports
missing words, extra words, wrong word order, wrong articles, missing `to`, missing verb
forms, wrong prepositions, singular/plural mistakes, spelling and capitalisation — each with a
short explanation of the rule behind it.

It accepts what a teacher would accept:

- contractions in both directions (`it's` = `it is`, `cannot` = `can't`)
- British and American spelling (`organise` / `organize`)
- alternative formulations stored per sentence (`I need to ...` / `I have to ...`)

On top of that, typical learner patterns are detected in your own text, independently of the
target sentence — for example `since three years` → *use "for" with a period of time*, or
`more easy` → *short adjectives take -er*.

## Repeats and weak words

Mistakes are stored per word. Words with more mistakes than correct uses become *weak words*
and are preferred when the next exercise is picked.

A sentence you got wrong goes into a repeat queue and comes back the same day. Every time you
get it right the interval grows (1 → 3 → 7 → 16 → 35 days); after that the sentence is
considered learned and leaves the queue.

## Stack

- **backend** Node 20, Express, SQLite (better-sqlite3), JWT in an httpOnly cookie
- **frontend** React 18, Vite, plain CSS, no UI framework
- **docker** two containers, one named volume, no separate database service

```
backend/src
  server.js        express app, security middleware, routes
  analyzer.js      sentence alignment, mistake classification, explanations
  db.js            sqlite connection, schema bootstrap, migrations
  seed.js          categories, idempotent import of the sentence data
  data/            the sentence corpus, split by topic
  auth.js          hashing, tokens, auth middleware
  routes/          auth, exercises, progress
frontend/src
  App.jsx          shell, navigation, theme
  pages/           Auth, Dashboard, Practice, WeakWords, Progress, Library, Settings
  components/      Feedback, Ring
```

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | create an account |
| POST | `/api/auth/login` | sign in (rate limited) |
| POST | `/api/auth/logout` | clear the session cookie |
| GET | `/api/auth/me` | current user |
| GET | `/api/exercises/categories` | categories, levels, modes |
| GET | `/api/exercises/next` | next exercise (`mode`, `category`, `level`, `queue=review`) |
| GET | `/api/exercises/mine` | your own sentences |
| POST | `/api/exercises` | add a sentence |
| DELETE | `/api/exercises/:id` | delete one of your sentences |
| POST | `/api/exercises/:id/answer` | check an answer, store mistakes, schedule the repeat |
| GET | `/api/progress` | today, streak, accuracy, weak words, due repeats |
| GET | `/api/statistics` | last 28 days, mistake types, modes, levels, categories |
| GET | `/api/weak-words` | words to repeat |
| GET | `/api/mistakes` | last mistakes with the original sentence |
| GET / PUT | `/api/settings` | daily goal and preferred level |
| GET | `/api/export` | your data as a JSON download |

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `JWT_SECRET` | – | required, at least 32 characters |
| `APP_PORT` | `8080` | host port of the web app |
| `DAILY_GOAL` | `20` | default daily goal for new accounts |
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

Add a row to one of the files in `backend/src/data/`:

```js
['docker', 'B2', 'The container exposes port eight thousand to the host.', null, ['...']]
```

Fields: category, level, correct sentence, optional wrong version for the Grammar Challenge,
optional list of alternative correct answers. Seeding is idempotent and updates existing
sentences on the next start without touching your progress.
