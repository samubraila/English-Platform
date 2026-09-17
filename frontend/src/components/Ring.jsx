export default function Ring({ value, size = 84, stroke = 8, label, onHero = false }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(100, value)) / 100;

  return (
    <svg className={'ring' + (onHero ? ' on-hero' : '')} width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} role="img" aria-label={(label || value + '%') + ' complete'}>
      <defs>
        <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <circle className="track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
      <circle
        className="value"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        strokeDasharray={circumference * filled + ' ' + circumference}
        transform={'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
        {label || value + '%'}
      </text>
    </svg>
  );
}
