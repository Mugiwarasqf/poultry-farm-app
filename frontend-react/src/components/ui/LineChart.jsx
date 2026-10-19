import { useId } from 'react';

/**
 * A small, dependency-free line chart for the dashboard's Production
 * Performance card. The project has no chart library installed, and this
 * one chart doesn't justify adding one.
 *
 * It only ever draws the points it is given: no smoothing, no padding with
 * invented values. Callers decide what an empty or thin series looks like.
 *
 * @param {{ label: string, value: number }[]} points  Oldest first.
 * @param {(v: number) => string} formatTick            Y-axis tick label.
 */
export function LineChart({ points, height = 170, formatTick = (v) => v.toLocaleString(), color = '#B7DA3E' }) {
  const gradientId = useId();
  const W = 560;
  const H = height;
  const pad = { top: 10, right: 12, bottom: 24, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = rawMax - rawMin || Math.abs(rawMax) * 0.1 || 1;
  const lo = Math.max(0, rawMin - spread * 0.25);
  const hi = rawMax + spread * 0.25;

  const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - ((v - lo) / (hi - lo)) * innerH;

  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${pad.top + innerH} L${x(0).toFixed(1)},${pad.top + innerH} Z`;

  // At most ~7 date labels, always including the last one.
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const showLabel = (i) => i === points.length - 1 || (i % labelEvery === 0 && points.length - 1 - i >= labelEvery / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={pad.left}
            x2={W - pad.right}
            y1={y(t)}
            y2={y(t)}
            strokeWidth="1"
            className="stroke-[#E1E8EF] dark:stroke-[#2B3238] transition-colors"
          />
          <text
            x={pad.left - 8}
            y={y(t) + 3.5}
            textAnchor="end"
            fontSize="10.5"
            className="fill-[#70829B] dark:fill-[#94A3B8] transition-colors"
          >
            {formatTick(t)}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          <circle
            cx={x(i)}
            cy={y(p.value)}
            r="3.5"
            fill={color}
            strokeWidth="1.5"
            className="stroke-white dark:stroke-[#17191A] transition-colors"
          >
            <title>{`${p.label}: ${p.value.toLocaleString()}`}</title>
          </circle>
          {showLabel(i) && (
            <text
              x={x(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize="10.5"
              className="fill-[#70829B] dark:fill-[#94A3B8] transition-colors"
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default LineChart;
