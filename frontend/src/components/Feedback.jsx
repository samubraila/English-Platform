import { mistakeLabel, speak } from '../modes.js';
import Ring from './Ring.jsx';

const HINT = {
  minor: 'capitalisation',
  spelling: 'spelling',
  missing: 'missing',
  wrong: 'wrong word',
  extra: 'not needed',
  order: 'wrong position'
};

export default function Feedback({ result, onNext }) {
  const tone = result.correct ? 'ok' : result.score >= 70 ? 'warn' : 'bad';

  return (
    <section className="card stack pop" aria-live="polite">
      <div className="result-head">
        <Ring value={result.score} size={84} />
        <div className="stack tight grow">
          <h2 style={{ color: 'var(--' + tone + ')' }}>
            {result.correct ? 'Correct' : result.score >= 70 ? 'Almost there' : 'Not yet'}
          </h2>
          <p className="muted">
            {result.summary.matched} of {result.summary.words} words matched
            {result.summary.missing ? ' · ' + result.summary.missing + ' missing' : ''}
            {result.summary.grammar ? ' · ' + result.summary.grammar + ' grammar' : ''}
            {result.summary.spelling ? ' · ' + result.summary.spelling + ' spelling' : ''}
            {result.summary.order ? ' · ' + result.summary.order + ' word order' : ''}
          </p>
          {result.nextReview && <span className="tag warn">Repeat scheduled</span>}
          {result.graduated && <span className="tag ok">Learned — removed from repeats</span>}
        </div>
      </div>

      <div className="tokens">
        {result.tokens.map((token, index) => (
          <span key={index} className={'token ' + token.status}>
            <span>{token.status === 'missing' ? '[ ' + token.word + ' ]' : token.word}</span>
            {token.status !== 'correct' && <small>{HINT[token.status] || token.status}</small>}
          </span>
        ))}
      </div>

      {result.mistakes.length > 0 && (
        <ul className="mistake-list">
          {result.mistakes.slice(0, 6).map((mistake, index) => (
            <li className="mistake" key={index}>
              <span className="type">{mistakeLabel(mistake.type)}</span>
              <p>{mistake.message}</p>
              {mistake.explanation && <p className="why">{mistake.explanation}</p>}
            </li>
          ))}
          {result.mistakes.length > 6 && <li className="muted">and {result.mistakes.length - 6} more mistakes in this sentence</li>}
        </ul>
      )}

      {result.advice?.length > 0 && (
        <ul className="mistake-list">
          {result.advice.map((tip, index) => (
            <li className="mistake tip" key={index}>
              <span className="type">Tip</span>
              <p>{tip}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="stack tight">
        <div className="spread">
          <span className="tag accent">Correct sentence</span>
          <button className="chip" type="button" onClick={() => speak(result.correction)} aria-label="Listen to the correct sentence">
            🔊 Listen
          </button>
        </div>
        <p className="puzzle sentence">{result.correction}</p>
        {result.alsoCorrect?.length > 0 && (
          <p className="muted">Also correct: {result.alsoCorrect.join(' / ')}</p>
        )}
      </div>

      <button className="btn block lg" type="button" onClick={onNext}>
        Next exercise
      </button>
    </section>
  );
}
