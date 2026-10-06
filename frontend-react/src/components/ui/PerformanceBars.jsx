/**
 * Compact bullet chart: one row per measure, a slim value bar on a grey
 * track that's shaded into four benchmark zones (darker = worse), with a tick
 * at the target. Bars start at zero; lower-is-better measures (mortality,
 * feed conversion) shade the other way round.
 *
 * Single series, so no legend. The value is printed at the end of each row
 * and a hover / focus tooltip gives value, target and rating.
 *
 * @param {{ bars: Array<{label:string, value:number, display:string, max:number, zones:number[], target:number, lowerIsBetter?:boolean, unit?:string}> }} props
 */

const BAR_COLOR = '#0D5C3A';
// Zone shades, best → worst. Recessive greys so only the value bar is loud.
const ZONE_SHADES = ['#F5F5F4', '#EEECEA', '#E5E2DF', '#D9D5D1'];
const ZONE_NAMES = ['Excellent', 'Good', 'Fair', 'Needs attention'];

const clamp = (v, max) => Math.max(0, Math.min(v, max));
const fmt = (n, unit) => `${Math.round(n * 100) / 100}${unit || ''}`;

/** Zone segments left → right as { from, to, rank } (rank 0 = best). */
function zonesFor({ zones, max, lowerIsBetter }) {
  const [a, b, c] = zones;
  if (lowerIsBetter) {
    return [
      { from: 0, to: a, rank: 0 },
      { from: a, to: b, rank: 1 },
      { from: b, to: c, rank: 2 },
      { from: c, to: max, rank: 3 },
    ];
  }
  return [
    { from: 0, to: a, rank: 3 },
    { from: a, to: b, rank: 2 },
    { from: b, to: c, rank: 1 },
    { from: c, to: max, rank: 0 },
  ];
}

function ratingOf(bar) {
  const [a, b, c] = bar.zones;
  const v = bar.value;
  if (bar.lowerIsBetter) return v <= a ? 0 : v <= b ? 1 : v <= c ? 2 : 3;
  return v >= c ? 0 : v >= b ? 1 : v >= a ? 2 : 3;
}

function BarRow({ bar }) {
  const pct = (v) => `${(clamp(v, bar.max) / bar.max) * 100}%`;
  const rating = ZONE_NAMES[ratingOf(bar)];
  const target = `${bar.lowerIsBetter ? '≤ ' : '≥ '}${fmt(bar.target, bar.unit)}`;
  const description = `${bar.label}: ${bar.display}. Target ${target}. ${rating}.`;

  return (
    <div
      className="group relative grid grid-cols-[96px_minmax(0,1fr)_64px] sm:grid-cols-[120px_minmax(0,1fr)_72px] items-center gap-3 py-1.5 outline-none rounded-md focus-visible:ring-2 focus-visible:ring-[#0D5C3A]/30"
      tabIndex={0}
      aria-label={description}
    >
      <span className="text-xs text-stone-600 truncate">{bar.label}</span>

      <div className="relative h-4" aria-hidden="true">
        {/* Benchmark zones, separated by a 2px surface gap */}
        <div className="absolute inset-0 flex gap-[2px] rounded-[3px] overflow-hidden">
          {zonesFor(bar).map((z) => (
            <span
              key={z.from}
              style={{ width: pct(z.to - z.from + 0), background: ZONE_SHADES[z.rank], flexShrink: 0, flexGrow: 0 }}
            />
          ))}
        </div>
        {/* Value bar: square at the baseline, 4px rounded data-end */}
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-r-[4px]"
          style={{ width: pct(bar.value), background: BAR_COLOR }}
        />
        {/* Target tick */}
        <span className="absolute top-0 h-4 w-[2px] -ml-px bg-stone-800 rounded-full" style={{ left: pct(bar.target) }} />

        {/* Tooltip */}
        <span className="pointer-events-none absolute bottom-full mb-2 z-10 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-[11px] text-white shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ left: `min(${pct(bar.value)}, calc(100% - 9rem))` }}
        >
          {bar.display} · target {target} · {rating}
        </span>
      </div>

      <span className="text-xs font-semibold text-stone-900 text-right tabular-nums">{bar.display}</span>
    </div>
  );
}

export function PerformanceBars({ bars }) {
  if (!bars?.length) return null;
  return (
    <div>
      {bars.map((bar) => <BarRow key={bar.label} bar={bar} />)}
      <p className="mt-1.5 text-[11px] text-stone-400">
        Tick marks the target · shading runs from needs attention (dark) to excellent (light)
      </p>
    </div>
  );
}

export default PerformanceBars;
