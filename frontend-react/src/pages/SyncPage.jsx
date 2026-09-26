import { useState } from 'react';
import { syncBatch } from '../api/sync';

export function SyncPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const data = await syncBatch(input);
      setOutput(JSON.stringify(data, null, 2));
    } catch (e) {
      setOutput('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 font-heading flex items-center gap-2">
          <span>🔄</span>
          <span>Offline Data Sync</span>
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Paste JSON Lines payload (one queued offline write entry per line) to process in bulk.
        </p>
      </div>

      {/* Sync Payload Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-4">
        <label className="text-xs font-semibold text-stone-700 block">
          JSON Lines Payload
        </label>
        <textarea
          className="w-full min-h-[140px] p-3.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-mono text-xs focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all placeholder:text-stone-400"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={'{"resource":"mortality","batchId":"...","entryId":"...","date":"2024-01-01","count":2}\n{"resource":"feed","batchId":"...","entryId":"...","date":"2024-01-01","feedType":"grower","amountKg":50,"costNaira":15000}'}
        />

        <div className="flex justify-end">
          <button
            className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner !w-4 !h-4 !border-white/40 !border-t-white" />
                <span>Syncing…</span>
              </>
            ) : (
              <span>Process Sync Payload</span>
            )}
          </button>
        </div>
      </div>

      {/* Response Box */}
      {output && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            Sync Response Output
          </div>
          <pre className="w-full p-4 bg-stone-900 text-emerald-400 rounded-2xl text-xs font-mono overflow-x-auto shadow-inner border border-stone-800">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
