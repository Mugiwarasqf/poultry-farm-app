import { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ShieldCheck, Check, ArrowRight, Info, CalendarClock, ClipboardCheck } from 'lucide-react';
import { CalendarPicker } from './CalendarPicker';
import { useToast } from './Toast';
import { useBatches } from '../../context/BatchContext';
import { saveVaccination } from '../../api/vaccinations';
import { QUEUED_SAVE_MESSAGE } from '../../lib/offlineQueue';
import { ROUTES, DOSE_NUMBERS, DOSES_PER_VIAL, vaccinesFor, findVaccine } from '../../lib/vaccines';
import { birdTypeLabel } from '../../lib/batch';
import { toIso } from '../../lib/supplements';
import { CalendarIcon } from './CalendarIcon';
import { BellIcon } from './BellIcon';

const GIVEN_BY = ['Myself', 'Farm staff', 'Vet'];

const FIELD = 'w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400';
const LABEL = 'text-xs font-bold text-stone-800 block mb-1.5';

function formatDisplayDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function Pills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? '' : opt)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
            value === opt
              ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
              : 'bg-white text-stone-600 border-stone-200 hover:border-[#0D5C3A]/40 hover:text-[#0D5C3A]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/**
 * Schedule a vaccination for later, or record one that was given.
 *
 * Step 1 picks what and when on the appointment calendar; step 2 asks only
 * for what that vaccine's route needs. Scheduled ones feed the daily email
 * reminder; recorded ones build the vaccination history (the "when did we
 * last vaccinate?" question from the farmer interviews).
 *
 * Props:
 *  isOpen, onClose
 *  onSaved({ mode, item, batchId })  — after a successful save, to refresh lists
 *  batches         — batches to choose from (omit when defaultBatchId is set)
 *  defaultBatchId  — fixes the batch and hides the selector
 *  events          — calendar appointments from buildHealthEvents()
 *  prefill         — { mode, vaccineName, date, scheduleId, doseNumber } e.g.
 *                    when recording a scheduled vaccination as given
 */
export function VaccinationModal({
  isOpen,
  onClose,
  onSaved,
  batches: batchOptions,
  defaultBatchId = '',
  events = [],
  prefill,
  title,
}) {
  const { batches: allBatches } = useBatches();
  const toast = useToast();
  const batches = batchOptions || allBatches;
  const todayIso = toIso(new Date());

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('schedule'); // 'schedule' | 'record'
  const [batchId, setBatchId] = useState(defaultBatchId);
  const [date, setDate] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [customName, setCustomName] = useState('');
  const [route, setRoute] = useState('');
  const [doseNumber, setDoseNumber] = useState('');
  const [birds, setBirds] = useState('');
  const [dosesPerVial, setDosesPerVial] = useState(1000);
  const [lotNumber, setLotNumber] = useState('');
  const [givenBy, setGivenBy] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fresh form every time it opens, seeded from prefill when given.
  useEffect(() => {
    if (!isOpen) return;
    const startMode = prefill?.mode || 'schedule';
    setStep(prefill?.date ? 2 : 1);
    setMode(startMode);
    const startBatchId = defaultBatchId || prefill?.batchId || (batches.length === 1 ? batches[0].batchId : '');
    const startBatch = allBatches.find((b) => b.batchId === startBatchId);
    setBatchId(startBatchId);
    setBirds(startBatch?.birdCount ? String(startBatch.birdCount) : '');
    setDate(prefill?.date || '');
    setVaccineName(prefill?.vaccineName || '');
    setCustomName('');
    setDoseNumber(prefill?.doseNumber || '');
    setDosesPerVial(1000);
    setLotNumber('');
    setGivenBy('');
    setCost('');
    setNotes('');
    setScheduleId(prefill?.scheduleId || '');
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const batch = batches.find((b) => b.batchId === batchId) || allBatches.find((b) => b.batchId === batchId);
  const vaccineOptions = useMemo(() => vaccinesFor(batch?.type), [batch?.type]);

  // A prefilled name that isn't in the catalogue (typed earlier as "Other")
  // is carried as a custom name.
  useEffect(() => {
    if (!isOpen || !prefill?.vaccineName) return;
    if (!findVaccine(prefill.vaccineName)) {
      setVaccineName('Other vaccine');
      setCustomName(prefill.vaccineName);
    }
  }, [isOpen, prefill?.vaccineName]);

  const vaccine = findVaccine(vaccineName);
  const isOther = vaccine?.id === 'other';

  // The vaccine decides the route; the farmer can still override it.
  useEffect(() => {
    setRoute(vaccine?.route || '');
  }, [vaccineName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default the bird count to the batch size.
  useEffect(() => {
    if (batch?.birdCount) setBirds(String(batch.birdCount));
  }, [batch?.batchId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const finalName = isOther ? customName.trim() : vaccineName;
  const birdCount = Number(birds) || 0;
  const vialsNeeded = birdCount > 0 ? Math.ceil(birdCount / dosesPerVial) : 0;
  const routeInfo = ROUTES[route];
  const isRecord = mode === 'record';

  // Only this batch's appointments on the calendar, when a batch is chosen.
  const calendarEvents = batchId ? events.filter((e) => !e.batchId || e.batchId === batchId) : events;

  const switchMode = (next) => {
    setMode(next);
    // Keep the chosen date only if it's still valid for the new mode.
    if (date && ((next === 'schedule' && date < todayIso) || (next === 'record' && date > todayIso))) setDate('');
  };

  const canContinue = date && batchId;
  const canSave = canContinue && finalName && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setSubmitting(true);
    const shared = {
      vaccineName: finalName,
      ...(route ? { route } : {}),
      ...(doseNumber ? { doseNumber } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(dosesPerVial ? { dosesPerVial } : {}),
    };
    const payload = isRecord
      ? {
          ...shared,
          dateAdministered: date,
          ...(birdCount ? { birdsVaccinated: birdCount, vialsUsed: vialsNeeded } : {}),
          ...(lotNumber.trim() ? { lotNumber: lotNumber.trim() } : {}),
          ...(givenBy ? { administeredBy: givenBy } : {}),
          ...(cost ? { costNaira: Number(cost) } : {}),
        }
      : {
          ...shared,
          dueDate: date,
          ...(birdCount ? { birdsToVaccinate: birdCount } : {}),
        };

    try {
      const result = await saveVaccination({ mode, batchId, scheduleId: isRecord ? scheduleId : undefined, ...payload });
      toast(
        result.item?.queued ? QUEUED_SAVE_MESSAGE : isRecord ? 'Vaccination recorded' : 'Vaccination scheduled',
        'success'
      );
      onSaved?.({ ...result, batchId, scheduleId: isRecord ? scheduleId : undefined });
      onClose();
    } catch (err) {
      toast(err.message || 'Could not save the vaccination', 'error');
      setSubmitting(false);
    }
  };

  const heading = title || (isRecord ? 'Record Vaccination' : 'Schedule Vaccination');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl z-10 animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {step === 2 && !prefill?.date && (
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
              <h2 className="text-lg font-bold text-stone-950 font-heading truncate">{heading}</h2>
              <p className="text-xs text-stone-500 mt-0.5 truncate">
                {step === 1
                  ? isRecord ? 'Pick the day it was given.' : 'Pick the day it is due. Existing appointments are shown on the calendar.'
                  : batch ? `${batch.name} · ${birdTypeLabel(batch.type)}` : 'Vaccine details'}
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
              {/* Mode */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl">
                {[
                  { id: 'schedule', label: 'Schedule for later', icon: CalendarClock },
                  { id: 'record', label: 'Record as given', icon: ClipboardCheck },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => switchMode(m.id)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      mode === m.id ? 'bg-white text-[#0D5C3A] shadow-xs' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <m.icon size={15} />
                    {m.label}
                  </button>
                ))}
              </div>

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

              <CalendarPicker
                value={date}
                onChange={setDate}
                events={calendarEvents}
                minDate={isRecord ? undefined : todayIso}
                maxDate={isRecord ? todayIso : undefined}
              />
            </>
          )}

          {step === 2 && (
            <>
              {/* Date chip */}
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#EAF5EF] border border-[#CFE8D9] rounded-2xl">
                <CalendarIcon size={15} className="text-[#0D5C3A] shrink-0" />
                <span className="text-sm font-bold text-[#0D472B]">
                  {isRecord ? 'Given on ' : 'Due on '}{formatDisplayDate(date)}
                </span>
                {!prefill?.date && (
                  <button type="button" onClick={() => setStep(1)} className="ml-auto text-[11px] font-bold text-[#0D5C3A] hover:underline cursor-pointer">
                    Change
                  </button>
                )}
              </div>

              {/* Vaccine */}
              <div>
                <label className={LABEL}>Vaccine <span className="text-rose-500">*</span></label>
                <select value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} className={`${FIELD} font-semibold cursor-pointer`}>
                  <option value="">Choose a vaccine</option>
                  {vaccineOptions.map((v) => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
                {isOther && (
                  <input
                    type="text"
                    placeholder="Vaccine name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className={`${FIELD} mt-2`}
                    autoFocus
                  />
                )}
              </div>

              {/* What this vaccine needs */}
              {vaccine && !isOther && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Info size={15} className="text-[#0D5C3A] shrink-0 mt-0.5" />
                    <div className="text-xs text-stone-700 space-y-1">
                      <div><span className="font-bold text-stone-900">Given by:</span> {ROUTES[vaccine.route].label}{vaccine.site ? ` — ${vaccine.site}` : ''}</div>
                      {vaccine.typicalAge && <div><span className="font-bold text-stone-900">Usual timing:</span> {vaccine.typicalAge}</div>}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Method</label>
                  <select value={route} onChange={(e) => setRoute(e.target.value)} className={`${FIELD} cursor-pointer`}>
                    <option value="">Choose method</option>
                    {Object.entries(ROUTES).map(([id, r]) => (
                      <option key={id} value={id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Dose</label>
                  <Pills options={DOSE_NUMBERS} value={doseNumber} onChange={setDoseNumber} />
                </div>
              </div>

              {routeInfo && (
                <p className="text-[11px] leading-relaxed text-stone-500 bg-white border border-dashed border-stone-300 rounded-xl px-3.5 py-2.5">
                  {routeInfo.tip}
                </p>
              )}

              {/* Quantity — how much vaccine to buy / how much was used */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>{isRecord ? 'Birds vaccinated' : 'Birds to vaccinate'}</label>
                  <input type="number" min="1" inputMode="numeric" value={birds} onChange={(e) => setBirds(e.target.value)} className={FIELD} placeholder="e.g. 500" />
                </div>
                <div>
                  <label className={LABEL}>Vial size</label>
                  <select value={dosesPerVial} onChange={(e) => setDosesPerVial(Number(e.target.value))} className={`${FIELD} cursor-pointer`}>
                    {DOSES_PER_VIAL.map((n) => (
                      <option key={n} value={n}>{n.toLocaleString()} doses</option>
                    ))}
                  </select>
                </div>
              </div>
              {vialsNeeded > 0 && (
                <p className="text-xs text-stone-600 -mt-2">
                  {isRecord ? 'That is ' : 'You will need '}
                  <span className="font-bold text-stone-900">{vialsNeeded} vial{vialsNeeded === 1 ? '' : 's'}</span>
                  {' '}of {dosesPerVial.toLocaleString()} doses.
                </p>
              )}

              {isRecord ? (
                <>
                  <div>
                    <label className={LABEL}>Given by</label>
                    <Pills options={GIVEN_BY} value={givenBy} onChange={setGivenBy} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Vaccine batch no. <span className="text-stone-400 font-normal">(optional)</span></label>
                      <input type="text" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className={FIELD} placeholder="On the vial label" />
                    </div>
                    <div>
                      <label className={LABEL}>Cost (₦) <span className="text-stone-400 font-normal">(optional)</span></label>
                      <input type="number" min="0" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} className={FIELD} placeholder="e.g. 4500" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl border border-stone-200 p-4">
                  <div className="w-8 h-8 rounded-full bg-[#EAF5EF] flex items-center justify-center shrink-0">
                    <BellIcon size={15} className="text-[#0D5C3A]" />
                  </div>
                  <div className="text-xs text-stone-600">
                    <div className="font-bold text-stone-900">Reminder</div>
                    You will get an email reminder 3 days before and again on the day.
                  </div>
                </div>
              )}

              <div>
                <label className={LABEL}>Notes <span className="text-stone-400 font-normal">(optional)</span></label>
                <textarea
                  rows={2}
                  placeholder={isRecord ? 'e.g. Some birds missed, repeat next week' : 'e.g. Give early morning before feeding'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${FIELD} resize-none`}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-stone-100 shrink-0 space-y-2">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canContinue}
              className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white shadow-xs"
            >
              <span>{!batchId ? 'Choose a batch' : !date ? 'Pick a date' : 'Continue'}</span>
              {canContinue && <ArrowRight size={16} />}
            </button>
          ) : (
            <>
              {finalName && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-700">
                  <ShieldCheck size={15} className="text-[#0D5C3A] shrink-0" />
                  <span className="truncate">
                    <strong className="text-stone-900">{finalName}</strong>
                    {doseNumber && ` (${doseNumber})`}
                    {routeInfo && ` · ${routeInfo.label}`}
                    {birdCount > 0 && ` · ${birdCount.toLocaleString()} birds`}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white shadow-xs"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>{isRecord ? 'Save Vaccination Record' : 'Schedule Vaccination'}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VaccinationModal;
