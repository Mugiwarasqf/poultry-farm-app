import { useEffect, useState } from 'react';
import { X, Check, PackagePlus, Minus, Plus } from 'lucide-react';
import { useToast } from './Toast';
import { createFeedPurchase } from '../../api/feedStock';
import { FEED_TYPES, FEED_BRANDS, formatNaira } from '../../lib/feeds';
import { FEED_BAG_SIZES, FEED_BAG_KG } from '../../lib/batch';
import { toIso } from '../../lib/supplements';
import { Spinner } from './Spinner';

const FIELD = 'w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400';
const LABEL = 'text-xs font-bold text-stone-800 block mb-1.5';

function Chip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
        active ? 'bg-[#DFFF83] text-[#17191A] border-[#B7DA3E]' : 'bg-white text-stone-700 border-stone-200 hover:border-[#D2EC7A]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Add feed to the farm's store — what was bought, not which batch eats it.
 * Batches take from the store when their usage is recorded.
 *
 * Props: isOpen, onClose, onSaved(purchase)
 */
export function FeedPurchaseModal({ isOpen, onClose, onSaved }) {
  const toast = useToast();
  const today = toIso(new Date());

  const [feedType, setFeedType] = useState('');
  const [customType, setCustomType] = useState('');
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [bagSizeKg, setBagSizeKg] = useState(FEED_BAG_KG);
  const [bags, setBags] = useState('');
  const [pricePerBag, setPricePerBag] = useState('');
  const [date, setDate] = useState(today);
  const [supplier, setSupplier] = useState('');
  const [bestBefore, setBestBefore] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFeedType('');
    setCustomType('');
    setBrand('');
    setCustomBrand('');
    setBagSizeKg(FEED_BAG_KG);
    setBags('');
    setPricePerBag('');
    setDate(toIso(new Date()));
    setSupplier('');
    setBestBefore('');
    setNotes('');
    setSaving(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const isOtherType = feedType === 'Other feed';
  const isOtherBrand = brand === 'Other';
  const finalType = isOtherType ? customType.trim() : feedType;
  const finalBrand = isOtherBrand ? customBrand.trim() : brand;
  const bagCount = Number(bags) || 0;
  const total = bagCount * (Number(pricePerBag) || 0);
  const canSave = finalType && bagCount > 0 && date && !saving;

  const step = (delta) => setBags(String(Math.max(0, bagCount + delta)));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const saved = await createFeedPurchase({
        date,
        feedType: finalType,
        bags: bagCount,
        bagSizeKg,
        ...(finalBrand ? { brand: finalBrand } : {}),
        ...(Number(pricePerBag) > 0 ? { pricePerBagNaira: Number(pricePerBag) } : {}),
        ...(supplier.trim() ? { supplier: supplier.trim() } : {}),
        ...(bestBefore ? { bestBefore } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast(`${bagCount} bag${bagCount === 1 ? '' : 's'} added to the feed store`, 'success');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast(err.message || 'Could not add the feed', 'error');
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
              <PackagePlus size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-stone-950 font-heading">Add Feed Stock</h2>
              <p className="text-xs text-stone-500">Feed you bought for the farm. Batches use from this store.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer shrink-0" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          <div>
            <label className={LABEL}>Feed type <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FEED_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFeedType(t.label)}
                  className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                    feedType === t.label ? 'bg-[#DFFF83] text-[#17191A] border-[#B7DA3E]' : 'bg-white text-stone-700 border-stone-200 hover:border-[#D2EC7A]'
                  }`}
                >
                  <span className="block text-xs font-bold">{t.label}</span>
                  {t.stage && (
                    <span className={`block text-[10px] mt-0.5 ${feedType === t.label ? 'text-[#17191A]/60' : 'text-stone-400'}`}>{t.stage}</span>
                  )}
                </button>
              ))}
            </div>
            {isOtherType && (
              <input type="text" value={customType} onChange={(e) => setCustomType(e.target.value)} className={`${FIELD} mt-2`} placeholder="Feed name" autoFocus />
            )}
          </div>

          <div>
            <label className={LABEL}>Brand</label>
            <div className="flex flex-wrap gap-2">
              {[...FEED_BRANDS, 'Other'].map((b) => (
                <Chip key={b} active={brand === b} onClick={() => setBrand(brand === b ? '' : b)}>{b}</Chip>
              ))}
            </div>
            {isOtherBrand && (
              <input type="text" value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} className={`${FIELD} mt-2`} placeholder="Brand name" />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Number of bags <span className="text-rose-500">*</span></label>
              <div className="flex items-stretch gap-2">
                <button type="button" onClick={() => step(-1)} className="w-11 rounded-xl border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-50 cursor-pointer" aria-label="One bag less">
                  <Minus size={16} />
                </button>
                <input type="number" min="1" inputMode="numeric" value={bags} onChange={(e) => setBags(e.target.value)} className={`${FIELD} text-center font-bold`} placeholder="0" />
                <button type="button" onClick={() => step(1)} className="w-11 rounded-xl border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-50 cursor-pointer" aria-label="One bag more">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className={LABEL}>Bag size</label>
              <div className="flex gap-2">
                {FEED_BAG_SIZES.map((size) => (
                  <Chip key={size} active={bagSizeKg === size} onClick={() => setBagSizeKg(size)} className="flex-1">{size}kg</Chip>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Price per bag (₦)</label>
              <input type="number" min="0" inputMode="numeric" value={pricePerBag} onChange={(e) => setPricePerBag(e.target.value)} className={FIELD} placeholder="e.g. 20500" />
              <p className="text-[11px] text-stone-400 mt-1">Used to work out what each batch's feed cost.</p>
            </div>
            <div>
              <label className={LABEL}>Date bought <span className="text-rose-500">*</span></label>
              <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Supplier <span className="text-stone-400 font-normal">(optional)</span></label>
              <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className={FIELD} placeholder="e.g. Ikorodu feed depot" />
            </div>
            <div>
              <label className={LABEL}>Best before <span className="text-stone-400 font-normal">(optional)</span></label>
              <input type="date" min={today} value={bestBefore} onChange={(e) => setBestBefore(e.target.value)} className={FIELD} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Notes <span className="text-stone-400 font-normal">(optional)</span></label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${FIELD} resize-none`} placeholder="e.g. Paid half, balance next week" />
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-stone-100 shrink-0 space-y-2">
          {finalType && bagCount > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-700">
              <span className="truncate">
                <strong className="text-stone-900">{bagCount} × {bagSizeKg}kg</strong> {finalType}{finalBrand ? ` (${finalBrand})` : ''}
              </span>
              {total > 0 && <strong className="text-stone-900 shrink-0">{formatNaira(total)}</strong>}
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#DFFF83] hover:bg-[#C5E95A] active:bg-[#B3D944] text-[#17191A] shadow-xs"
          >
            {saving ? (<><Spinner /> Saving…</>) : (<><Check size={16} /> Add to Feed Store</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedPurchaseModal;
