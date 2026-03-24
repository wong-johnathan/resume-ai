interface FitScoreDonutProps {
  score: number; // 0–100
}

const SIZE = 100;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function tierInfo(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'Strong Match', color: '#16a34a' };
  if (score >= 40) return { label: 'Moderate Match', color: '#d97706' };
  return { label: 'Weak Match', color: '#dc2626' };
}

export function FitScoreDonut({ score }: FitScoreDonutProps) {
  const { label, color } = tierInfo(score);
  const filled = (score / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{score}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">Match Score</p>
        <p className="text-xs mt-0.5" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}
