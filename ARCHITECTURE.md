# WORDTRACE — Architecture

Analysis of the existing application and the state it is in after the card-engine rework.
No external AI service, no paid API, everything runs offline in two containers.

## 1. Overview

```
browser ──► nginx (frontend container) ──► express (backend container) ──► SQLite file (volume)
            static React bundle              /api/*                        wordtrace.db
```

The frontend is a static bundle; nginx serves it and proxies `/api/` to the backend over the
internal docker network. The backend is the only process that touches the database. There is
no third container and no external service of any kind.

## 2. Frontend

React 18 + Vite, plain CSS, no UI framework, no router library, no state library.

| File | Lines | Responsibility |
| --- | --- | --- |
| `App.jsx` | 150 | Shell: hash router, session, theme, sidebar + bottom navigation |
| `api.js` | 44 | One `fetch` wrapper, cookie based, throws `Error` with the server message |
| `modes.js` | 51 | Mode list, mistake labels, `speak()` (TTS), `recognizer()` (speech input) |
| `pages/Auth.jsx` | 83 | Login / register |
| `pages/Dashboard.jsx` | 148 | Hero with daily goal, 4 stats, mode tiles, recent mistakes, topics |
| `pages/Practice.jsx` | 267 | The learning screen: mode chips, filters, exercise, answer, session panel |
| `pages/WeakWords.jsx` | 80 | Weak words + last mistakes |
| `pages/Progress.jsx` | 141 | 28-day chart, mistake types, modes, categories, levels |
| `pages/Library.jsx` | 120 | Own sentences (add / delete) |
| `pages/Settings.jsx` | 94 | Daily goal, level, theme, export, sign out |
| `components/Feedback.jsx` | 87 | Score ring, per-word diff, mistakes with explanation, correct sentence |
| `components/Puzzle.jsx` | 45 | Interactive first letters + hint strip |
| `components/Ring.jsx` | 29 | SVG progress ring |
| `styles.css` | 867 | Design tokens, layout, components, responsive rules |

Routing is `window.location.hash` plus a `hashchange` listener — 10 lines instead of a router
dependency. State is local `useState` per page; there is no store and no client cache.

## 3. Backend

Node 20 + Express 4, ES modules, `better-sqlite3` (synchronous, no pool, no ORM).

| File | Lines | Responsibility |
| --- | --- | --- |
| `server.js` | 45 | App wiring, helmet, JSON limit, rate limit, CORS, routes, error handler |
| `db.js` | 27 | Opens the database, runs `schema.sql`, adds missing columns, date helpers |
| `schema.sql` | 83 | All tables, `CREATE TABLE IF NOT EXISTS` only |
| `seed.js` | 47 | 18 categories + idempotent import of the sentence corpus |
| `data/*.js` | 378 | The corpus: 343 sentences as `[category, level, text, corrupted, alternatives]` |
| `analyzer.js` | 304 | The learning engine (see 5.) |
| `generator.js` | 184 | The card engine: registry of all exercise types (see 6.) |
| `forms.js` | 125 | English word forms and multiple choice distractors |
| `constants.js` | 3 | Levels and limits shared by the routes |
| `hints.js` | 64 | Letter → example words index, built from the corpus, cached in memory |
| `auth.js` | 43 | bcrypt hashing, JWT signing, cookie options, `requireAuth`, input validation |
| `routes/auth.js` | 53 | register / login / logout / me, login rate limited to 10 per 15 min |
| `routes/exercises.js` | 193 | Selection, answer checking, review scheduling, own sentences |
| `routes/progress.js` | 118 | Progress, statistics, weak words, mistakes, settings, export |

## 4. Database

SQLite, file in the `wordtrace-data` volume, WAL mode, foreign keys on.

| Table | Key columns | Purpose |
| --- | --- | --- |
| `users` | email, password_hash, daily_goal, level | accounts and their settings |
| `categories` | slug, name, icon, sort | the 18 topics |
| `exercises` | category_id, level, text, corrupted, alternatives, owner_id | **the source material**: one row = one sentence |
| `answers` | user_id, exercise_id, mode, input, score, correct, seconds | every submitted answer |
| `mistakes` | answer_id, type, word, expected, message | every single mistake of an answer |
| `words` | user_id, word, mistakes, correct, last_seen | per-word statistics → weak words |
| `progress` | user_id, day, exercises, correct, seconds | one row per day → streak, heatmap |
| `reviews` | user_id, exercise_id, due, step, lapses | repeat queue, intervals 1/3/7/16/35 |

Migrations are additive only: `db.js` checks `pragma_table_info` and adds missing columns. There
is no migration history and no down-migration.

**Important property of the model:** a row in `exercises` is not a card, it is a *sentence*. The
different exercise types are generated from that sentence at request time. 343 sentences × 9
card types are more than 3.000 possible exercises without storing a single generated row.

## 5. Learning engine (`analyzer.js`)

No AI. The whole analysis is tokenisation, alignment and rules.

```
tokenize()   raw words → {raw, norm, rawIndex, variant}
             expands contractions (it's → it is) and normalises spelling variants
align()      longest common subsequence over the normalised tokens
             → equal | missing | extra, adjacent missing+extra merged into one substitution
classify()   missing → article / "to" / auxiliary / preposition / word
             substitution → number / article / tense / preposition / spelling / wrong word
score()      penalty per mistake, content words weigh more, capitalisation weighs 0.3
analyze()    runs the comparison against the original and every stored alternative,
             keeps the best result, adds rule explanations and pattern advice
```

`ADVICE` is a second, independent layer: 13 regular expressions that look at the *user's* text
alone and catch classic learner patterns (`since three years`, `more easy`, `depends of`,
`explain me`, `discuss about`, …). It fires even when the sentence has nothing to do with them.

Exported helpers used elsewhere: `words`, `normalize`, `firstLetters`, `levenshtein`,
`blankIndex`, `contentWords`, `isContentWord`.

## 6. Card engine (`generator.js`)

One registry, one entry per card type, three functions each:

```js
'multiple-choice': {
  label, ui: 'choice',
  supports: (item) => contentGaps(item.text).length > 0,
  build:    (item) => ({ prompt, gap, options }),
  check:    (item, input, card) => checkGap(item, card.gap, input)
}
```

| Type | Generated from the sentence | UI |
| --- | --- | --- |
| `first-letter` | `firstLetters()` + `letterHints()` | text |
| `reconstruction` | shuffled word list, punctuation stripped | text |
| `missing-word` | `blankIndex()`, one function word, stable per exercise | text |
| `cloze` | a random content word, a different one on every build | text |
| `multiple-choice` | content word + 3 distractors from `forms.js` | choice |
| `spelling` | one content word, spoken by the browser | text |
| `grammar` | the stored `corrupted` variant | text |
| `listening` / `speaking` | the sentence itself, spoken by the browser | text |

`MODES` is derived from the registry and travels to the frontend through
`/exercises/categories`, so a new card type needs one entry here and one line of presentation
metadata in `frontend/src/modes.js`.

Gap based types send their `gap` index to the client and get it back with the answer; the
server validates the range and falls back to `blankIndex()`. `supports()` is used twice: when
selecting an exercise (a grammar card needs a `corrupted` variant) and when accepting an answer.

`forms.js` holds the English word rules: third person, past, gerund, plural, singular and base
form (verified by rebuilding the input from the candidate), plus the closed sets for articles,
prepositions and auxiliaries. Distractors come from the word family or the closed set, filled
up with corpus words that start with the same letter.

## 7. Repeat scheduling

Per (user, exercise), not per card type. Wrong answer → `due = today`, `step = 0`, `lapses + 1`.
Correct answer on a scheduled item → next interval from `[1, 3, 7, 16, 35]`; after the last one
the row is deleted and the sentence counts as learned. There is no Again/Hard/Good/Easy rating
and no difficulty or stability value.

## 8. Selection

`pickExercise()` builds one SQL statement:

```
ORDER BY seen ASC,          -- least seen first
         weak_score DESC,   -- sentences containing the user's weak words first
         RANDOM()
```

`weak_score` is a sum of `CASE WHEN lower(text) LIKE ?` over the top 8 weak words. Filters:
category, level, `corrupted IS NOT NULL` for grammar mode, exclude the previous id, and
`owner_id IS NULL OR owner_id = user`.

## 9. API

All routes need the session cookie except `register`, `login` and `health`.

```
POST   /api/auth/register|login|logout      GET /api/auth/me
GET    /api/exercises/categories            GET /api/exercises/next?mode&category&level&queue&exclude
GET    /api/exercises/mine                  POST /api/exercises        DELETE /api/exercises/:id
GET    /api/exercises/:id                   POST /api/exercises/:id/answer
GET    /api/progress  /statistics  /weak-words  /mistakes  /export
GET    /api/settings                        PUT  /api/settings
```

## 10. Security

| Area | Implementation |
| --- | --- |
| Passwords | bcrypt, cost 12; unknown email still runs a hash to keep the timing flat |
| Session | JWT in an httpOnly, SameSite=strict cookie, 7 days, `COOKIE_SECURE` for HTTPS |
| Secrets | `JWT_SECRET` from the environment, refuses to start below 32 characters |
| SQL | exclusively prepared statements with bound parameters |
| XSS | React escaping only, no `dangerouslySetInnerHTML` anywhere |
| Headers | helmet on the API, CSP / X-Frame-Options / nosniff in nginx |
| Rate limits | 240 requests/min globally, 10 login attempts per 15 min |
| Payload | JSON limited to 16 kB, answer to 500 characters, sentence to 300 |
| CSRF | relies on SameSite=strict; there is no token |

## 11. Docker

```
backend    node:20-alpine, multi stage (build deps only in stage 1), runs as node,
           healthcheck on /api/health, volume wordtrace-data:/app/data
frontend   node build stage → nginx:alpine, security headers, gzip, /api proxy, SPA fallback
```

`docker compose up -d` is enough. `JWT_SECRET` is required, everything else has defaults.

## 12. Findings

### Bugs

| # | Where | Problem |
| --- | --- | --- |
| B1 | `routes/exercises.js` `pickReview()` | Ignored the mode, so a repeat in grammar mode could return a sentence without a `corrupted` variant → empty card. **Fixed:** candidates run through `supports()`. |
| B2 | `routes/exercises.js` `/next` | `review` was true even when the queue was empty and a normal exercise came back. **Fixed:** the flag comes from the actual hit. |
| B3 | `routes/exercises.js` `recordAnswer()` | After a one-word gap every content word of the sentence counted as "correct". **Fixed:** only the words that were really checked are scored. |
| B4 | `routes/progress.js` `/progress` | `user.daily_goal` on a deleted user threw → 500. **Fixed:** answers 401. |
| B5 | `routes/exercises.js` `/:id/answer` | The mode from the body was never validated against the exercise. **Fixed:** `supports()` rejects it with 400. |

### Duplication / dead code

| # | Where | Problem |
| --- | --- | --- |
| D1 | 4 files | `LEVELS` was defined four times. **Fixed:** `constants.js` in the backend, the frontend reads the list from the API. |
| D2 | backend + frontend | The mode list existed twice. **Fixed:** the registry is the single source, the frontend only adds icons and wording. |
| D3 | `GET /api/exercises/:id` | Dead endpoint. **Fixed:** removed. |
| D4 | `Dashboard`, `Practice`, `Library` | Fetched the catalogue three times. **Fixed:** promise cache in `api.js`, invalidated on writes. |

### Gaps against the product goal

Decks, tags, search, filters, import, card types beyond the six modes, vocabulary with
translation/definition/word forms, word relations, scenario and email training, Again/Hard/
Good/Easy rating, heatmap, quick training, swipe gestures, content packs, tests.

### Performance

Nothing is slow at the current size (343 sentences, one user). `refreshDue()` and the catalogue
now share the cache in `api.js` (30 s / 5 min). Still open: `/export` loads every answer into
memory at once, and selection reads 8 candidate rows instead of 1 to evaluate `supports()`.

## 14. Tests

`npm test` in `backend/` runs the node test runner. No framework, no external service.

| File | Covers |
| --- | --- |
| `test/analyzer.test.js` | tokenisation, first letters, levenshtein, every mistake class, contractions, spelling variants, alternatives, learner patterns |
| `test/forms.test.js` | third person, past, gerund, plural, singular, base form, word family, distractors |
| `test/generator.test.js` | the registry, one card per type, gap handling, cloze variation, choice options, `supports()`, seeding |

`generator.test.js` seeds a throwaway SQLite file in the temp directory and closes it again, so
the tests never touch the real database.

## 13. Conventions

- No comments in code; names carry the meaning.
- Backend: ES modules, named exports, no classes, no DI container.
- SQL lives in the route that uses it; there is no repository layer.
- Errors: `{ error: "sentence in English" }`, the frontend shows the message as it comes.
- The frontend never builds business logic that the backend already owns.
