import { useEffect, useState } from 'react';

/**
 * Header badge showing the part of the day on the farmer's own clock:
 * morning (5am-11:59am), noon (12pm-5:59pm) or night (6pm-4:59am).
 * Rechecks every minute so it changes over without a reload.
 */
const PERIODS = [
  { from: 5, to: 12, emoji: '🌅', label: 'Morning' },
  { from: 12, to: 18, emoji: '☀️', label: 'Noon' },
];
const NIGHT = { emoji: '🌙', label: 'Night' };

function periodFor(date) {
  const hour = date.getHours();
  return PERIODS.find((p) => hour >= p.from && hour < p.to) || NIGHT;
}

export function TimeOfDay() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const { emoji, label } = periodFor(now);

  return (
    <div className="inline-flex items-center gap-3" title={`Good ${label.toLowerCase()}`}>
      <span
        className="text-[34px] leading-none drop-shadow-[0_2px_4px_rgba(20,32,51,0.18)] select-none"
        role="img"
        aria-label={label}
      >
        {emoji}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#70829B] tabular-nums">
          {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
        <span className="text-base font-semibold text-[#142033] font-heading">{label}</span>
      </span>
    </div>
  );
}

export default TimeOfDay;
