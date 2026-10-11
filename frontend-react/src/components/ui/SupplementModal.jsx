import { useEffect, useState } from 'react';
import { X, ChevronLeft, Check, ArrowRight, Droplets, AlertTriangle } from 'lucide-react';
import { CalendarPicker } from './CalendarPicker';
import { PillIcon } from './PillIcon';
import { useToast } from './Toast';
import { useBatches } from '../../context/BatchContext';
import { SUPPLEMENT_TYPES, METHODS, REASONS, findSupplementType, addSupplement, toIso, describeDose } from '../../lib/supplements';
import { birdTypeLabel } from '../../lib/batch';
import { FeedIcon } from './FeedIcon';
import { CalendarIcon } from './CalendarIcon';

const FIELD = 'w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400';
const LABEL = 'text-xs font-bold text-stone-800 block mb-1.5';

function formatShort(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/**
 * Record a vitamin, supplement or dewormer given to a batch.
 *
 * The type picks sensible defaults (method, course length); the method
 * decides how the dose is written; dewormers ask for the withdrawal period.
 * Saved on this device only — there is no supplements endpoint yet.
 *
 * Props: isOpen, onClose, onSaved(list), batches, defaultBatchId, events
 */
export function SupplementModal({ isOpen, onClose, onSaved, batches: batchOptions, defaultBatchId = '', events = [] }) {
  const { batches: allBatches } = useBatches();
  const toast = useToast();
  const batches = batchOptions || allBatches;

  const [step, setStep] = useState(1);
  const [batchId, setBatchId] = useState(defaultBatchId);
  const [date, setDate] = useState('');
  const [typeId, setTypeId] = useState('');
  const [product, setProduct] = useState('');
  const [method, setMethod] = useState('water');
  const [doseAmount, setDoseAmount] = useState('');
  const [doseUnit, setDoseUnit] = useState('g');
  const [perQuantity, setPerQuantity] = useState('1');
  const [durationDays, setDurationDays] = useState('1');
  const [reason, setReason] = useState('');
  const [withdrawalDays, setWithdrawalDays] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setBatchId(defaultBatchId || (batches.length === 1 ? batches[0].batchId : ''));
    setDate(toIso(new Date()));
    setTypeId('');
    setProduct('');
    setMethod('water');
    setDoseAmount('');
    setDoseUnit('g');
    setPerQuantity('1');
    setDurationDays('1');
    setReason('');
    setWithdrawalDays('');
    setCost('');
    setNotes('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const type = findSupplementType(typeId);
  const methodInfo = METHODS[method];
  const batch = allBatches.find((b) => b.batchId === batchId);
  const days = Math.max(Number(durationDays) || 1, 1);
  const lastDay = date ? addDays(date, days - 1) : '';
  const safeDate = lastDay && Number(withdrawalDays) > 0 ? addDays(lastDay, Number(withdrawalDays) + 1) : '';

  const chooseType = (t) => {
    setTypeId(t.id);
    setMethod(t.method);
    setDoseUnit(METHODS[t.method].units[0]);
    setDurationDays(String(t.duration));
    if (!t.withdrawal) setWithdrawalDays('');
  };

  const chooseMethod = (m) => {
    setMethod(m);
    setDoseUnit(METHODS[m].units[0]);
  };

  const calendarEvents = batchId ? events.filter((e) => !e.batchId || e.batchId === batchId) : events;
  const canContinue = date && batchId;
  const canSave = canContinue && type && product.trim() && Number(doseAmount) > 0;

  const handleSave = () => {
    if (!canSave) return;
    const entry = {
      batchId,
      batchName: batch?.name || '',
      date,
      type: typeId,
      product: product.trim(),
      method,
      doseAmount: Number(doseAmount),
      doseUnit,
      perQuantity: Number(perQuantity) || methodInfo.defaultPer,
      durationDays: days,
      ...(reason ? { reason } : {}),
      ...(type.withdrawal && Number(withdrawalDays) > 0 ? { withdrawalDays: Number(withdrawalDays) } : {}),
      ...(cost ? { costNaira: Number(cost) } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    const list = addSupplement(entry);
    toast(`${type.label} recorded`, 'success');
    onSaved?.(list);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl z-10 animate-fade-in flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                aria-label="Back to calendar"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-stone-950 font-heading truncate">Record Vitamin / Supplement</h2>
              <p className="text-xs text-stone-500 mt-0.5 truncate">
                {step === 1 ? 'Pick the day the course starts.' : batch ? `${batch.name} · ${birdTypeLabel(batch.type)}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {step === 1 && (
            <>
              {!defaultBatchId && batches.length > 1 && (
                <div>
                  <label className={LABEL}>Batch <span className="text-rose-500">*</span></label>
                  <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={`${FIELD} font-semibold cursor-pointer`}>
                    <option value="">Choose a batch</option>
                    {batches.map((b) => (
                      <option key={b.batchId} value={b.batchId}>{b.name} ({birdTypeLabel(b.type)})</option>
                    ))}
                  </select>
                </div>
              )}
              <CalendarPicker value={date} onChange={setDate} events={calendarEvents} />
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#F7FFE0] border border-[#E3F5A8] rounded-2xl">
                <CalendarIcon size={15} className="text-[#4D6600] shrink-0" />
                <span className="text-sm font-bold text-[#3A4D00]">
                  {days > 1 ? `${formatShort(date)} to ${formatShort(lastDay)}` : formatShort(date)}
                </span>
                <button type="button" onClick={() => setStep(1)} className="ml-auto text-[11px] font-bold text-[#4D6600] hover:underline cursor-pointer">
                  Change
                </button>
              </div>

              {/* Type */}
              <div>
                <label className={LABEL}>What are you giving? <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUPPLEMENT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => chooseType(t)}
                      className={`px-3 py-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        typeId === t.id
                          ? 'bg-[#DFFF83] text-[#17191A] border-[#B7DA3E]'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-[#D2EC7A]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {type && (
                <>
                  <div>
                    <label className={LABEL}>Product name <span className="text-rose-500">*</span></label>
                    <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} className={FIELD} placeholder={type.examples} />
                  </div>

                  {/* Method */}
                  <div>
                    <label className={LABEL}>How is it given?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'water', icon: Droplets },
                        { id: 'feed', icon: FeedIcon },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => chooseMethod(m.id)}
                          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            method === m.id
                              ? 'bg-[#F7FFE0] text-[#4D6600] border-[#B7DA3E]'
                              : 'bg-white text-stone-600 border-stone-200 hover:border-[#D2EC7A]'
                          }`}
                        >
                          <m.icon size={15} />
                          {METHODS[m.id].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dose: amount + unit per quantity */}
                  <div>
                    <label className={LABEL}>Dose <span className="text-rose-500">*</span></label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        value={doseAmount}
                        onChange={(e) => setDoseAmount(e.target.value)}
                        className={`${FIELD} w-24`}
                        placeholder="e.g. 5"
                      />
                      <select value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)} className={`${FIELD} w-20 cursor-pointer`}>
                        {methodInfo.units.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <span className="text-xs text-stone-500">per</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        value={perQuantity}
                        onChange={(e) => setPerQuantity(e.target.value)}
                        className={`${FIELD} w-20`}
                      />
                      <span className="text-xs text-stone-600">{methodInfo.per}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1.5">Use the dose on the product label.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Number of days</label>
                      <input type="number" min="1" inputMode="numeric" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className={FIELD} />
                    </div>
                    <div>
                      <label className={LABEL}>Cost (₦) <span className="text-stone-400 font-normal">(optional)</span></label>
                      <input type="number" min="0" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} className={FIELD} placeholder="e.g. 3500" />
                    </div>
                  </div>

                  {type.withdrawal && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                      <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle size={14} /> Withdrawal period (days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={withdrawalDays}
                        onChange={(e) => setWithdrawalDays(e.target.value)}
                        className={`${FIELD} w-32`}
                        placeholder="From label"
                      />
                      <p className="text-[11px] text-amber-900/80">
                        {safeDate
                          ? `Don't sell or eat eggs or meat from this batch until ${formatShort(safeDate)}.`
                          : 'Days after the last dose before eggs or meat are safe to sell. It is printed on the label.'}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className={LABEL}>Reason</label>
                    <div className="flex flex-wrap gap-2">
                      {REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReason(reason === r ? '' : r)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            reason === r
                              ? 'bg-[#DFFF83] text-[#17191A] border-[#B7DA3E]'
                              : 'bg-white text-stone-600 border-stone-200 hover:border-[#D2EC7A] hover:text-[#4D6600]'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Notes <span className="text-stone-400 font-normal">(optional)</span></label>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${FIELD} resize-none`} placeholder="e.g. Given in the morning water only" />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-stone-100 shrink-0 space-y-2">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canContinue}
              className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#DFFF83] hover:bg-[#C5E95A] active:bg-[#B3D944] text-[#17191A] shadow-xs"
            >
              <span>{!batchId ? 'Choose a batch' : !date ? 'Pick a date' : 'Continue'}</span>
              {canContinue && <ArrowRight size={16} />}
            </button>
          ) : (
            <>
              {canSave && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-700">
                  <PillIcon size={15} className="text-[#4D6600] shrink-0" />
                  <span className="truncate">
                    <strong className="text-stone-900">{product.trim()}</strong>
                    {' · '}
                    {describeDose({ doseAmount, doseUnit, method, perQuantity, durationDays: days })}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#DFFF83] hover:bg-[#C5E95A] active:bg-[#B3D944] text-[#17191A] shadow-xs"
              >
                <Check size={16} />
                <span>Save Record</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SupplementModal;
