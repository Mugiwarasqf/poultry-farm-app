import { useCallback, useEffect, useState } from 'react';
import { Plus, Stethoscope, HeartPulse, TrendingDown, CheckCircle2, Check, X } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { createLog } from '../../api/logs';
import { getSickBayCases, createSickBayCase, closeSickBayCase } from '../../api/sickBay';
import { formatDate } from '../../lib/batch';
import { toIso } from '../../lib/supplements';
import { SkeletonRows } from '../ui/Skeleton';

// Signs a farmer can spot without a vet. Tapping one is quicker than typing,
// and the same words make cases easy to compare later.
const SYMPTOMS = [
  'Not eating',
  'Diarrhoea',
  'Coughing / sneezing',
  'Swollen eyes or face',
  'Weak / droopy',
  'Lameness',
  'Drop in laying',
  'Ruffled feathers',
];

const FIELD = 'w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400';
const LABEL = 'text-xs font-bold text-stone-800 block mb-1.5';

function Tile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-2 text-stone-500">
        <Icon size={15} strokeWidth={2.5} className="text-stone-500 shrink-0" />
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-stone-950 font-heading tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-stone-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function Sheet({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl z-10 animate-fade-in flex flex-col max-h-[92vh]" role="dialog" aria-label={title}>
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-stone-100 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-stone-950 font-heading">{title}</h2>
            {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer shrink-0" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-4">{children}</div>
        <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-stone-100 shrink-0">{footer}</div>
      </div>
    </div>
  );
}

const primaryBtn = 'w-full py-3.5 rounded-2xl font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] shadow-xs';

/**
 * Sick Bay: birds taken out of the flock because they're sick, followed
 * until they recover or die. Deaths are also written to the batch's
 * mortality log, so bird counts and loss figures stay right.
 *
 * @param {Object} props
 * @param {Object} props.batch
 * @param {number} props.birdsAlive          Birds still in the batch.
 * @param {boolean} props.readOnly           Completed batches can be viewed, not changed.
 * @param {() => void} props.onMortalityLogged  Refresh the batch's mortality list.
 * @param {number} props.openSignal          Bump to open the "isolate birds" form from outside.
 */
export function SickBayTab({ batch, birdsAlive, readOnly = false, onMortalityLogged, openSignal = 0 }) {
  const toast = useToast();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState(null); // the case being closed
  const [saving, setSaving] = useState(false);

  // New-case form
  const [date, setDate] = useState(toIso(new Date()));
  const [count, setCount] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [cause, setCause] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');

  // Close-case form
  const [recovered, setRecovered] = useState('');
  const [died, setDied] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCases(await getSickBayCases(batch.batchId));
    } catch (err) {
      setError(err.status === 404 ? 'Sick bay needs the latest backend deployed.' : 'Could not load sick bay records.');
    } finally {
      setLoading(false);
    }
  }, [batch.batchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (openSignal > 0 && !readOnly) openAdd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  const openCases = cases.filter((c) => c.status === 'open');
  const closedCases = cases.filter((c) => c.status === 'closed');
  const inSickBay = openCases.reduce((s, c) => s + (Number(c.birdCount) || 0), 0);
  const totalRecovered = closedCases.reduce((s, c) => s + (Number(c.recoveredCount) || 0), 0);
  const totalDied = closedCases.reduce((s, c) => s + (Number(c.diedCount) || 0), 0);
  const treatedTotal = totalRecovered + totalDied;

  function openAdd() {
    setDate(toIso(new Date()));
    setCount('');
    setSymptoms([]);
    setCause('');
    setTreatment('');
    setNotes('');
    setAdding(true);
  }

  const openClose = (c) => {
    setRecovered(String(c.birdCount));
    setDied('0');
    setOutcomeNotes('');
    setClosing(c);
  };

  const toggleSymptom = (s) => setSymptoms((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));

  const maxIsolate = Math.max(birdsAlive - inSickBay, 0);
  const countNum = Number(count) || 0;
  const canAdd = date && Number.isInteger(countNum) && countNum > 0 && countNum <= maxIsolate && !saving;

  const handleAdd = async () => {
    if (!canAdd) return;
    setSaving(true);
    try {
      const created = await createSickBayCase(batch.batchId, {
        dateIsolated: date,
        birdCount: countNum,
        ...(symptoms.length ? { symptoms } : {}),
        ...(cause.trim() ? { suspectedCause: cause.trim() } : {}),
        ...(treatment.trim() ? { treatment: treatment.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setCases((list) => [created, ...list]);
      toast(`${countNum} bird${countNum === 1 ? '' : 's'} moved to the sick bay`, 'success');
      setAdding(false);
    } catch (err) {
      toast(err.message || 'Could not save the sick bay record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const recoveredNum = Number(recovered) || 0;
  const diedNum = Number(died) || 0;
  const closeValid = closing && Number.isInteger(recoveredNum) && Number.isInteger(diedNum) && recoveredNum >= 0 && diedNum >= 0
    && recoveredNum + diedNum <= closing.birdCount && recoveredNum + diedNum > 0;

  const handleClose = async () => {
    if (!closeValid || saving) return;
    setSaving(true);
    try {
      const updated = await closeSickBayCase(batch.batchId, closing.caseId, {
        recoveredCount: recoveredNum,
        diedCount: diedNum,
        ...(outcomeNotes.trim() ? { outcomeNotes: outcomeNotes.trim() } : {}),
      });
      setCases((list) => list.map((c) => (c.caseId === closing.caseId ? { ...c, ...updated } : c)));

      // Deaths count as mortality for the batch.
      if (diedNum > 0) {
        const reason = closing.suspectedCause || (closing.symptoms || []).join(', ');
        try {
          await createLog(batch.batchId, 'mortality', {
            date: toIso(new Date()),
            count: diedNum,
            note: `Sick bay${reason ? `: ${reason}` : ''}`,
          });
          onMortalityLogged?.();
        } catch {
          toast('Case closed, but the deaths could not be added to Mortality. Please log them there.', 'error');
        }
      }
      toast('Sick bay case closed', 'success');
      setClosing(null);
    } catch (err) {
      toast(err.message || 'Could not close the case', 'error');
    } finally {
      setSaving(false);
    }
  };

  const unaccounted = closing ? closing.birdCount - recoveredNum - diedNum : 0;

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-stone-950 font-heading">Sick Bay</h2>
            <p className="text-xs text-stone-500 mt-0.5">Sick birds kept apart from the flock, and how they did.</p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4D6600] hover:underline cursor-pointer shrink-0"
            >
              <Plus size={14} strokeWidth={2.5} /> Isolate Birds
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Tile icon={Stethoscope} label="In sick bay now" value={loading ? '-' : inSickBay.toLocaleString()} hint={openCases.length ? `${openCases.length} open case${openCases.length === 1 ? '' : 's'}` : 'No open cases'} />
          <Tile icon={HeartPulse} label="Recovered" value={loading ? '-' : totalRecovered.toLocaleString()} hint={treatedTotal ? `${Math.round((totalRecovered / treatedTotal) * 100)}% of treated birds` : null} />
          <Tile icon={TrendingDown} label="Died in sick bay" value={loading ? '-' : totalDied.toLocaleString()} hint="Also counted in Mortality" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-bold text-stone-950 font-heading mb-2">Open Cases</h2>
        {loading ? (
          <SkeletonRows rows={2} />
        ) : error ? (
          <p className="py-4 text-sm text-stone-500">{error}</p>
        ) : openCases.length === 0 ? (
          <p className="py-4 text-sm text-stone-500">No birds in the sick bay.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {openCases.map((c) => (
              <li key={c.caseId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Stethoscope size={16} strokeWidth={2.5} className="text-stone-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-900">
                      {c.birdCount} bird{c.birdCount === 1 ? '' : 's'} · since {formatDate(c.dateIsolated)}
                    </div>
                    <div className="text-xs text-stone-500 break-words">
                      {[c.suspectedCause, (c.symptoms || []).join(', ')].filter(Boolean).join(' — ') || 'No symptoms recorded'}
                    </div>
                    {c.treatment && <div className="text-xs text-stone-500">Treatment: {c.treatment}</div>}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => openClose(c)}
                    className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border border-[#D2EC7A] text-[#4D6600] hover:bg-[#F7FFE0] transition-colors cursor-pointer shrink-0"
                  >
                    Close case
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {closedCases.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-bold text-stone-950 font-heading mb-2">Past Cases</h2>
          <ul className="divide-y divide-stone-100">
            {closedCases.map((c) => (
              <li key={c.caseId} className="flex items-start justify-between gap-3 py-3.5">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} strokeWidth={2.5} className="text-stone-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-900">
                      {c.birdCount} bird{c.birdCount === 1 ? '' : 's'}: {c.recoveredCount || 0} recovered, {c.diedCount || 0} died
                    </div>
                    <div className="text-xs text-stone-500 break-words">
                      {[c.suspectedCause, (c.symptoms || []).join(', ')].filter(Boolean).join(' — ') || 'No symptoms recorded'}
                      {c.outcomeNotes ? ` · ${c.outcomeNotes}` : ''}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-stone-500 shrink-0 text-right">
                  {formatDate(c.dateIsolated)}
                  {c.closedAt ? <><br />to {formatDate(c.closedAt)}</> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {adding && (
        <Sheet
          title="Isolate Sick Birds"
          subtitle={`${batch.name} · ${maxIsolate.toLocaleString()} birds can be moved`}
          onClose={() => setAdding(false)}
          footer={
            <button type="button" onClick={handleAdd} disabled={!canAdd} className={primaryBtn}>
              <Check size={16} /> {saving ? 'Saving…' : 'Move to Sick Bay'}
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date</label>
              <input type="date" max={toIso(new Date())} value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Number of birds <span className="text-rose-500">*</span></label>
              <input type="number" min="1" max={maxIsolate} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} className={FIELD} placeholder="e.g. 5" />
            </div>
          </div>
          {countNum > maxIsolate && (
            <p className="text-xs text-rose-600 -mt-2">Only {maxIsolate} birds are left to move.</p>
          )}
          <div>
            <label className={LABEL}>What do you see?</label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSymptom(s)}
                  aria-pressed={symptoms.includes(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    symptoms.includes(s) ? 'bg-[#DFFF83] text-[#17191A] border-[#B7DA3E]' : 'bg-white text-stone-600 border-stone-200 hover:border-[#D2EC7A]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={LABEL}>Suspected cause <span className="text-stone-400 font-normal">(optional)</span></label>
            <input type="text" value={cause} onChange={(e) => setCause(e.target.value)} className={FIELD} placeholder="e.g. Coccidiosis, injury, heat stress" />
          </div>
          <div>
            <label className={LABEL}>Treatment given <span className="text-stone-400 font-normal">(optional)</span></label>
            <input type="text" value={treatment} onChange={(e) => setTreatment(e.target.value)} className={FIELD} placeholder="e.g. Amprolium in water, 5 days" />
          </div>
          <div>
            <label className={LABEL}>Notes <span className="text-stone-400 font-normal">(optional)</span></label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${FIELD} resize-none`} />
          </div>
        </Sheet>
      )}

      {closing && (
        <Sheet
          title="Close Sick Bay Case"
          subtitle={`${closing.birdCount} bird${closing.birdCount === 1 ? '' : 's'} isolated on ${formatDate(closing.dateIsolated)}`}
          onClose={() => setClosing(null)}
          footer={
            <button type="button" onClick={handleClose} disabled={!closeValid || saving} className={primaryBtn}>
              <Check size={16} /> {saving ? 'Saving…' : 'Close Case'}
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Recovered</label>
              <input type="number" min="0" inputMode="numeric" value={recovered} onChange={(e) => setRecovered(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Died</label>
              <input type="number" min="0" inputMode="numeric" value={died} onChange={(e) => setDied(e.target.value)} className={FIELD} />
            </div>
          </div>
          {recoveredNum + diedNum > closing.birdCount ? (
            <p className="text-xs text-rose-600">That's more than the {closing.birdCount} birds in this case.</p>
          ) : unaccounted > 0 ? (
            <p className="text-xs text-stone-500">{unaccounted} bird{unaccounted === 1 ? ' is' : 's are'} not accounted for; they'll be treated as back in the flock.</p>
          ) : null}
          {diedNum > 0 && (
            <p className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
              {diedNum} death{diedNum === 1 ? '' : 's'} will also be added to this batch's Mortality.
            </p>
          )}
          <div>
            <label className={LABEL}>Notes <span className="text-stone-400 font-normal">(optional)</span></label>
            <textarea rows={2} value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} className={`${FIELD} resize-none`} placeholder="e.g. Vet confirmed coccidiosis" />
          </div>
        </Sheet>
      )}
    </>
  );
}

export default SickBayTab;
