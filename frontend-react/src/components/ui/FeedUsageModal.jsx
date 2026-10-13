import { useEffect, useMemo, useState } from 'react';
import { X, Check, AlertTriangle, PackagePlus, Sparkles } from 'lucide-react';
import { useToast } from './Toast';
import { useBatches } from '../../context/BatchContext';
import { createLog } from '../../api/logs';
import { QUEUED_SAVE_MESSAGE } from '../../lib/offlineQueue';
import { useFeedStock } from '../../lib/useFeedStock';
import { FEED_TYPES, findFeedType, recommendedFeedId, expectedBagsPerDay, formatNaira } from '../../lib/feeds';
import { FEED_BAG_SIZES, FEED_BAG_KG, birdTypeLabel, formatBags } from '../../lib/batch';
import { toIso } from '../../lib/supplements';
import { FeedIcon } from './FeedIcon';
import { Spinner } from './Spinner';

const FIELD = 'w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400';
const LABEL = 'text-xs font-bold text-stone-800 block mb-1.5';
const OFF_STOCK = '__off_stock__';
const QUICK_BAGS = [0.25, 0.5, 1, 2];

/**
 * Record feed a batch used. The feed comes out of the farm's store, so the
 * farmer picks which stock line it came from; the store goes down by that
 * many bags and the batch is charged at the average price paid per bag.
 *
 * Props:
 *  isOpen, onClose
 *  onSaved(entry)   — the saved usage entry (with batchId / batchName)
 *  defaultBatchId   — fixes the batch
 *  presetKey        — preselects a stock line
 *  onAddStock()     — opens the Add Feed Stock form
 */
export function FeedUsageModal({ isOpen, onClose, onSaved, defaultBatchId = '', presetKey = '', onAddStock }) {
  const toast = useToast();
  const { batches } = useBatches();
  const { stock, loading, error } = useFeedStock({ enabled: isOpen });
  const today = toIso(new Date());

  const [batchId, setBatchId] = useState(defaultBatchId);
  const [date, setDate] = useState(today);
  const [lineKey, setLineKey] = useState('');
  const [bags, setBags] = useState('');
  const [offType, setOffType] = useState('');
  const [offBagSize, setOffBagSize] = useState(FEED_BAG_KG);
  const [offCost, setOffCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const activeBatches = batches.filter((b) => (b.status || 'active') !== 'closed');
  const batch = batches.find((b) => b.batchId === batchId);
  const recommendedLabel = FEED_TYPES.find((t) => t.id === recommendedFeedId(batch))?.label;

  // Suitable feed first, then whatever's in stock, then empty lines.
  const lines = useMemo(() => {
    const suits = (l) => recommendedLabel && l.feedType.toLowerCase() === recommendedLabel.toLowerCase();
    return [...stock.lines].sort((a, b) => (b.left > 0) - (a.left > 0) || suits(b) - suits(a));
  }, [stock.lines, recommendedLabel]);

  useEffect(() => {
    if (!isOpen) return;
    setBatchId(defaultBatchId || (activeBatches.length === 1 ? activeBatches[0].batchId : ''));
    setDate(toIso(new Date()));
    setLineKey(presetKey || '');
    setBags('');
    setOffType('');
    setOffBagSize(FEED_BAG_KG);
    setOffCost('');
    setNotes('');
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Once stock has loaded, preselect the feed that suits this batch.
  useEffect(() => {
    if (!isOpen || lineKey || lines.length === 0) return;
    const pick = lines.find((l) => l.left > 0);
    if (pick) setLineKey(pick.key);
  }, [isOpen, lines, lineKey]);

  if (!isOpen) return null;

  const offStock = lineKey === OFF_STOCK;
  const line = lines.find((l) => l.key === lineKey);
  const bagCount = Number(bags) || 0;
  const bagSizeKg = offStock ? offBagSize : line?.bagSizeKg || FEED_BAG_KG;
  const feedTypeLabel = offStock ? offType.trim() : line?.feedType;
  const cost = offStock ? Number(offCost) || 0 : line?.avgPrice ? bagCount * line.avgPrice : 0;
  const overdraw = line && bagCount > Math.max(line.left, 0);
  const expected = batch && feedTypeLabel ? expectedBagsPerDay(batch, feedTypeLabel, bagSizeKg) : null;
  const canSave = batchId && date && feedTypeLabel && bagCount > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      date,
      feedType: feedTypeLabel,
      ...(line?.brand ? { brand: line.brand } : {}),
      bags: bagCount,
      bagSizeKg,
      amountKg: bagCount * bagSizeKg,
      costNaira: Math.round(cost),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    try {
      const created = await createLog(batchId, 'feed', payload);
      toast(created?.queued ? QUEUED_SAVE_MESSAGE : `${formatBags(bagCount)} recorded for ${batch?.name || 'batch'}`, 'success');
      onSaved?.({ ...payload, ...created, batchId, batchName: batch?.name || '' });
      onClose();
    } catch (err) {
      toast(err.message || 'Could not record the feed', 'error');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl shadow-2xl z-10 animate-fade-in flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#F7FFE0] text-[#4D6600] flex items-center justify-center shrink-0">
              <FeedIcon size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-stone-950 font-heading truncate">Record Feed Usage</h2>
              <p className="text-xs text-stone-500 truncate">
                {batch ? `${batch.name} · ${birdTypeLabel(batch.type)} · ${Number(batch.birdCount || 0).toLocaleString()} birds` : 'Feed taken from the store for a batch'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer shrink-0" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!defaultBatchId && (
              <div>
                <label className={LABEL}>Batch <span className="text-rose-500">*</span></label>
                <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={`${FIELD} font-semibold cursor-pointer`}>
                  <option value="">Choose a batch</option>
                  {activeBatches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>{b.name} ({birdTypeLabel(b.type)})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={LABEL}>Date <span className="text-rose-500">*</span></label>
              <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
            </div>
          </div>

          {/* Which feed */}
          <div>
            <label className={LABEL}>Feed from the store <span className="text-rose-500">*</span></label>
            {loading ? (
              <div className="py-6 text-center text-xs text-stone-400">Checking the feed store…</div>
            ) : (
              <div className="space-y-2">
                {lines.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-stone-300 p-4 text-center space-y-2">
                    <p className="text-xs text-stone-600">
                      {error ? 'The feed store could not be loaded.' : 'No feed in the store yet. Add what you bought first, so usage takes it off the stock.'}
                    </p>
                    {onAddStock && (
                      <button type="button" onClick={onAddStock} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] text-xs font-bold cursor-pointer">
                        <PackagePlus size={14} /> Add Feed Stock
                      </button>
                    )}
                  </div>
                )}

                {lines.map((l) => {
                  const selected = l.key === lineKey;
                  const suits = recommendedLabel && l.feedType.toLowerCase() === recommendedLabel.toLowerCase();
                  return (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => setLineKey(l.key)}
                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selected ? 'border-[#B7DA3E] bg-[#F7FFE0] ring-1 ring-[#B7DA3E]' : 'border-stone-200 hover:border-[#D2EC7A]'
                      } ${l.left <= 0 && !selected ? 'opacity-60' : ''}`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-stone-900 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span className="break-words">{l.label}</span>
                          {suits && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#DFFF83] text-[#17191A] text-[9px] font-bold shrink-0">
                              <Sparkles size={9} /> Suits this batch
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {l.bagSizeKg}kg bags{l.avgPrice ? ` · about ${formatNaira(l.avgPrice)}/bag` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-extrabold ${l.left <= 0 ? 'text-rose-600' : l.status === 'low' ? 'text-amber-700' : 'text-stone-950'}`}>
                          {l.left <= 0 ? 'Out of stock' : formatBags(l.left)}
                        </div>
                        {l.left > 0 && <div className="text-[10px] text-stone-400">left</div>}
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setLineKey(OFF_STOCK)}
                  className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                    offStock ? 'border-[#B7DA3E] bg-[#F7FFE0] ring-1 ring-[#B7DA3E] text-stone-900' : 'border-dashed border-stone-300 text-stone-500 hover:border-[#D2EC7A]'
                  }`}
                >
                  Feed not from the store (bought and used the same day, or given to you)
                </button>
              </div>
            )}
          </div>

          {offStock && (
            <div className="space-y-4 rounded-2xl border border-stone-200 p-4">
              <div>
                <label className={LABEL}>Feed type <span className="text-rose-500">*</span></label>
                <input type="text" list="feed-type-options" value={offType} onChange={(e) => setOffType(e.target.value)} className={FIELD} placeholder="e.g. Layer mash" />
                <datalist id="feed-type-options">
                  {FEED_TYPES.filter((t) => t.id !== 'other').map((t) => <option key={t.id} value={t.label} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Bag size</label>
                  <select value={offBagSize} onChange={(e) => setOffBagSize(Number(e.target.value))} className={`${FIELD} cursor-pointer`}>
                    {FEED_BAG_SIZES.map((s) => <option key={s} value={s}>{s}kg</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Cost (₦)</label>
                  <input type="number" min="0" inputMode="numeric" value={offCost} onChange={(e) => setOffCost(e.target.value)} className={FIELD} placeholder="Total paid" />
                </div>
              </div>
            </div>
          )}

          {/* How much */}
          {(line || offStock) && (
            <div>
              <label className={LABEL}>Bags used <span className="text-rose-500">*</span></label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  inputMode="decimal"
                  value={bags}
                  onChange={(e) => setBags(e.target.value)}
                  className={`${FIELD} w-28 font-bold`}
                  placeholder="0"
                />
                {QUICK_BAGS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setBags(String(q))}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      bagCount === q ? 'bg-[#DFFF83] text-[#17191A] border-[#B7DA3E]' : 'bg-white text-stone-700 border-stone-200 hover:border-[#D2EC7A]'
                    }`}
                  >
                    {q === 0.25 ? '¼' : q === 0.5 ? '½' : q} bag{q > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              {expected != null && (
                <p className="text-[11px] text-stone-500 mt-2">
                  Rough guide: {Number(batch.birdCount).toLocaleString()} birds on {findFeedType(feedTypeLabel)?.label.toLowerCase()} eat about{' '}
                  <strong className="text-stone-800">{formatBags(Math.round(expected * 4) / 4 || 0.25)} a day</strong>.
                </p>
              )}
              {overdraw && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <AlertTriangle size={13} className="shrink-0 mt-px" />
                  Only {formatBags(Math.max(line.left, 0))} left of this feed. If you bought more, add it to the store so the count stays right.
                </p>
              )}
            </div>
          )}

          <div>
            <label className={LABEL}>Notes <span className="text-stone-400 font-normal">(optional)</span></label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={FIELD} placeholder="e.g. Birds ate less, hot day" />
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-stone-100 shrink-0 space-y-2">
          {canSave && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-700">
              <span className="truncate">
                <strong className="text-stone-900">{formatBags(bagCount)}</strong> of {feedTypeLabel}
                {line && ` · ${formatBags(Math.max(line.left - bagCount, 0))} left after this`}
              </span>
              {cost > 0 && <strong className="text-stone-900 shrink-0">{formatNaira(cost)}</strong>}
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#DFFF83] hover:bg-[#C5E95A] active:bg-[#B3D944] text-[#17191A] shadow-xs"
          >
            {saving ? (<><Spinner /> Saving…</>) : (<><Check size={16} /> Save Feed Usage</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedUsageModal;
