import { useEffect, useState } from 'react';
import { X, Check, Flag } from 'lucide-react';
import { birdTypeLabel } from '../../lib/batch';

const FIELD = 'w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400';
const LABEL = 'text-xs font-bold text-stone-800 block mb-1.5';
const naira = (n) => `${n < 0 ? '−' : ''}₦${Math.round(Math.abs(n)).toLocaleString()}`;

/**
 * Mark a batch as completed (closed). Records what the farmer sold, since
 * sales are what meat-bird performance is judged on, and fills in the bird
 * cost if it wasn't given at creation. The batch then moves to History.
 *
 * Props:
 *  open, onClose, batch, purpose ('eggs'|'meat'|'dual'|'other'),
 *  birdsAlive, otherCosts (feed + vaccines + vitamins, ₦),
 *  onConfirm(updates) — async; receives the PATCH body.
 */
export function CompleteBatchModal({ open, onClose, batch, purpose, birdsAlive, otherCosts = 0, onConfirm }) {
  const [birdsSold, setBirdsSold] = useState('');
  const [revenue, setRevenue] = useState('');
  const [birdCost, setBirdCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setBirdsSold(String(birdsAlive || 0));
    setRevenue('');
    setBirdCost('');
    setNotes('');
    setSaving(false);
    setError('');
  }, [open, birdsAlive]);

  if (!open || !batch) return null;

  const eggsOnly = purpose === 'eggs';
  const hasBirdCost = Number(batch.purchaseCostNaira) > 0;
  const sold = Number(birdsSold) || 0;
  const sales = Number(revenue) || 0;
  const birdsCostNum = hasBirdCost ? Number(batch.purchaseCostNaira) : Number(birdCost) || 0;
  const profit = sales - birdsCostNum - otherCosts;
  const tooMany = sold > birdsAlive;

  const handleConfirm = async () => {
    if (tooMany) return;
    setSaving(true);
    setError('');
    try {
      await onConfirm({
        status: 'closed',
        birdsSold: sold,
        ...(sales > 0 ? { salesRevenueNaira: sales } : {}),
        ...(!hasBirdCost && Number(birdCost) > 0 ? { purchaseCostNaira: Number(birdCost) } : {}),
        ...(notes.trim() ? { completionNotes: notes.trim() } : {}),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not complete the batch');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl z-10 animate-fade-in flex flex-col max-h-[92vh]" role="dialog" aria-label="Complete batch">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#F7FFE0] text-[#4D6600] flex items-center justify-center shrink-0">
              <Flag size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-stone-950 font-heading truncate">Complete {batch.name}</h2>
              <p className="text-xs text-stone-500 truncate">{birdTypeLabel(batch.type)} · {birdsAlive.toLocaleString()} birds alive</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer shrink-0" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
          <p className="text-sm text-stone-600">
            Completing closes the batch and moves it to History. All its records stay there to view.
            {!eggsOnly && ' Record what you sold so the batch\'s profit can be worked out.'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>{eggsOnly ? 'Spent hens sold' : 'Birds sold'}</label>
              <input type="number" min="0" max={birdsAlive} inputMode="numeric" value={birdsSold} onChange={(e) => setBirdsSold(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Total sales (₦){eggsOnly && <span className="text-stone-400 font-normal"> (optional)</span>}</label>
              <input type="number" min="0" inputMode="numeric" value={revenue} onChange={(e) => setRevenue(e.target.value)} className={FIELD} placeholder="e.g. 2400000" />
            </div>
          </div>
          {tooMany && <p className="text-xs text-rose-600 -mt-2">Only {birdsAlive.toLocaleString()} birds are alive in this batch.</p>}
          {sold > 0 && sales > 0 && (
            <p className="text-xs text-stone-500 -mt-2">About {naira(sales / sold)} per bird.</p>
          )}

          {!hasBirdCost && (
            <div>
              <label className={LABEL}>What the birds cost to buy (₦) <span className="text-stone-400 font-normal">(optional)</span></label>
              <input type="number" min="0" inputMode="numeric" value={birdCost} onChange={(e) => setBirdCost(e.target.value)} className={FIELD} placeholder="For the whole batch" />
              <p className="text-[11px] text-stone-500 mt-1">Not recorded when the batch was created. Without it, profit leaves out the cost of the birds.</p>
            </div>
          )}

          <div>
            <label className={LABEL}>Notes <span className="text-stone-400 font-normal">(optional)</span></label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${FIELD} resize-none`} placeholder="e.g. Sold to Mile 12 market" />
          </div>

          {sales > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-stone-500">Sales</span><span className="font-semibold text-stone-900">{naira(sales)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Birds</span><span className="text-stone-700">{birdsCostNum ? `−${naira(birdsCostNum)}` : 'not recorded'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Feed, vaccines and vitamins</span><span className="text-stone-700">−{naira(otherCosts)}</span></div>
              <div className="flex justify-between pt-1.5 border-t border-stone-200">
                <span className="font-semibold text-stone-900">{profit >= 0 ? 'Profit' : 'Loss'}</span>
                <span className={`font-bold ${profit >= 0 ? 'text-[#4D6600]' : 'text-rose-600'}`}>{naira(profit)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-stone-100 shrink-0">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || tooMany}
            className="w-full py-3.5 rounded-2xl font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] shadow-xs"
          >
            <Check size={16} /> {saving ? 'Completing…' : 'Complete Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompleteBatchModal;
