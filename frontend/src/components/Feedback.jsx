import { mistakeLabel } from '../modes.js';

const STATUS_HINT = {
  correct: 'correct',
  minor: 'check capitalisation',
  spelling: 'spelling',
  missing: 'missing',
  wrong: 'wrong word',
  extra: 'extra word',
  order: 'wrong position'
};

export default function Feedback({ result }) {
  const tone = result.correct ? 'ok' : result.score >= 70 ? 'warn' : 'bad';

  return (
    <section className="card stack fade-in" aria-live="polite">
      <div className="result-head">
        <div className="score-ring" style={{ background: 'var(--' + tone + '-soft)', color: 'var(--' + tone + ')' }}>
          {result.score}%
        </div>
        <div className="stack tight">
          <h2>{result.correct ? 'Correct' : 'Almost there'}</h2>
          <p className="muted">
            {result.summary.matched} of {result.summary.words} words matched
            {result.summary.missing ? ' · ' + result.summary.missing + ' missing' : ''}
            {result.summary.grammar ? ' · ' + result.summary.grammar + ' grammar' : ''}
            {result.summary.spelling ? ' · ' + result.summary.spelling + ' spelling' : ''}
            {result.summary.order ? ' · ' + result.summary.order + ' order' : ''}
          </p>
        </div>
      </div>

      <div className="tokens">
        {result.tokens.map((token, index) => (
          <span key={index} className={'token ' + token.status}>
            {token.status === 'missing' ? '[' + token.word + ']' : token.word}
            {token.status !== 'correct' && <small>{STATUS_HINT[token.status]}</small>}
          </span>
        ))}
      </div>

      {result.mistakes.length > 0 && (
        <ul className="mistake-list">
          {result.mistakes.slice(0, 8).map((mistake, index) => (
            <li className="mistake" key={index}>
              <div className="stack tight">
                <span className="type">{mistakeLabel(mistake.type)}</span>
                <span>{mistake.message}</span>
              </div>
            </li>
          ))}
          {result.mistakes.length > 8 && <li className="muted">and {result.mistakes.length - 8} more mistakes in this sentence</li>}
        </ul>
      )}

      <div className="stack tight">
        <span className="tag accent">Correct sentence</span>
        <p className="puzzle sentence">{result.correction}</p>
      </div>
    </section>
  );
}
