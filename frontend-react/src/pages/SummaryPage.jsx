import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBatches } from '../context/BatchContext';
import { getSummary } from '../api/summary';

export function SummaryPage() {
  const { farmId } = useAuth();
  const { hasBatches } = useBatches();
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!farmId || !hasBatches) return;
    let cancelled = false;
    setLoading(true);
    getSummary(farmId, period)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => console.error(e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [farmId, period, hasBatches]);

  if (!hasBatches) {
    return (
      <div className="text-center py-12 px-4 bg-white rounded-3xl border border-stone-200 shadow-xs">
        <div className="w-14 h-14 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center text-2xl mb-3">
          💰
        </div>
        <h3 className="text-lg font-bold text-stone-900 font-heading mb-1">No financial data yet</h3>
        <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto mb-6">
          Create a flock batch and start logging feed purchases and egg sales to see your profit summary.
        </p>
      </div>
    );
  }

  const formatNaira = (n) => {
    if (n == null) return '—';
    const abs = Math.abs(n);
    const prefix = n < 0 ? '-₦' : '₦';
    return prefix + abs.toLocaleString();
  };

  const isPositive = data?.netNaira > 0;
  const isNegative = data?.netNaira < 0;

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 font-heading flex items-center gap-2">
            <span>💰</span>
            <span>Profit &amp; Expense Summary</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {data ? `Report period: ${data.startDate} → ${data.endDate}` : 'Loading date range…'}
          </p>
        </div>

        {/* Period toggle pills */}
        <div className="inline-flex bg-stone-200/80 p-1 rounded-xl gap-1 self-start sm:self-auto shadow-inner">
          <button
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              period === 'week'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            onClick={() => setPeriod('week')}
          >
            This Week
          </button>
          <button
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              period === 'month'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            onClick={() => setPeriod('month')}
          >
            This Month
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 gap-3 text-stone-400 text-sm">
          <div className="spinner" />
          <span>Calculating financial summaries…</span>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Main Net Profit Highlight Card */}
          <div
            className={`rounded-3xl p-6 sm:p-8 border shadow-sm transition-all ${
              isPositive
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : isNegative
                ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
              <span>Net Profit (Revenue minus Expenses)</span>
              <span className="text-xl">📊</span>
            </div>
            <div
              className={`text-3xl sm:text-5xl font-extrabold font-heading tracking-tight mb-2 ${
                isPositive
                  ? 'text-emerald-700'
                  : isNegative
                  ? 'text-rose-700'
                  : 'text-stone-900'
              }`}
            >
              {formatNaira(data.netNaira)}
            </div>
            <p className="text-xs sm:text-sm text-stone-500 font-medium">
              Calculated across all logged feed costs, drug &amp; vaccine expenses, and egg revenues for {period === 'week' ? 'the past 7 days' : 'the past 30 days'}.
            </p>
          </div>

          {/* Breakdown cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feed Cost */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                <span>Feed Cost</span>
                <span className="text-base">🌾</span>
              </div>
              <div className="text-2xl font-extrabold text-stone-900 font-heading truncate">
                {formatNaira(data.feedCostNaira)}
              </div>
              <div className="text-xs text-stone-400 mt-1">Total feed spent</div>
            </div>

            {/* Drug / Vaccine Cost */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                <span>Drug &amp; Vaccine</span>
                <span className="text-base">💉</span>
              </div>
              <div className="text-2xl font-extrabold text-stone-900 font-heading truncate">
                {formatNaira(data.drugCostNaira)}
              </div>
              <div className="text-xs text-stone-400 mt-1">Health &amp; treatments</div>
            </div>

            {/* Egg Revenue */}
            <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                <span>Egg Revenue</span>
                <span className="text-base">🥚</span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 font-heading truncate">
                {formatNaira(data.eggRevenueNaira)}
              </div>
              <div className="text-xs text-emerald-800/80 mt-1">Total crates sold</div>
            </div>

            {/* Birds Lost */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                <span>Birds Lost</span>
                <span className="text-base">📉</span>
              </div>
              <div className="text-2xl font-extrabold text-stone-900 font-heading">
                {data.birdsLost ?? '—'}
              </div>
              <div className="text-xs text-stone-400 mt-1">Total flock mortality</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
