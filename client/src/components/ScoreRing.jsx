// Circular gauge for the security-check score. score === null means "N/A".
export default function ScoreRing({ score, size = 150 }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const hasScore = score !== null && score !== undefined;
  const offset = hasScore ? circumference * (1 - score / 100) : circumference;
  const tone = !hasScore ? 'none' : score >= 80 ? 'good' : score >= 50 ? 'mid' : 'bad';

  return (
    <div
      className={`ring ring-${tone}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={hasScore ? `Security-check score: ${score} percent` : 'Security-check score not available'}
    >
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle className="ring-track" cx="64" cy="64" r={radius} />
        <circle
          className="ring-value"
          cx="64"
          cy="64"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="ring-label">
        <strong>{hasScore ? `${score}%` : 'N/A'}</strong>
        <span>{hasScore ? 'checks passed' : 'no applicable checks'}</span>
      </div>
    </div>
  );
}
