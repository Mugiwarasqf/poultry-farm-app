import { useState } from 'react';
import { X, ChevronLeft, Calendar, ShieldCheck, Bell, Check, ArrowRight } from 'lucide-react';
import { CalendarPicker } from './CalendarPicker';

const VACCINE_OPTIONS = [
  'Newcastle (ND)',
  'Gumboro (IBD)',
  "Marek's Disease",
  'Lasota',
  'Fowl Pox',
  'Infectious Bronchitis (IB)',
  'Dewormer',
  'Other Vaccination',
];

const REMINDER_OPTIONS = [
  { label: '1 day before', value: '1 day before' },
  { label: '3 days before', value: '3 days before' },
  { label: '5 days before', value: '5 days before' },
  { label: '7 days before', value: '7 days before' },
  { label: 'Day of', value: 'Day of' },
];

function formatDisplayDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * VaccinationModal — 2-step Airbnb-style calendar flow.
 * Step 1: Pick a date on the calendar.
 * Step 2: Enter vaccine name + set reminder.
 *
 * Props:
 *  isOpen      {boolean}
 *  onClose     {function}
 *  onConfirm   {function({ vaccineName, dueDate, reminderTiming })}
 *  batches     {array}        - list of batch objects for batch selector (optional)
 *  defaultBatchId {string}   - pre-selected batch (optional, skips batch selector)
 *  title       {string}      - modal title (optional)
 */
export function VaccinationModal({
  isOpen,
  onClose,
  onConfirm,
  batches = [],
  defaultBatchId = '',
  title = 'Schedule Vaccination',
}) {
  const today = new Date().toISOString().slice(0, 10);

  const [step, setStep] = useState(1); // 1 = calendar, 2 = details
  const [selectedDate, setSelectedDate] = useState('');
  const [vaccineName, setVaccineName] = useState('Newcastle (ND)');
  const [customVaccine, setCustomVaccine] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTiming, setReminderTiming] = useState('3 days before');
  const [selectedBatchId, setSelectedBatchId] = useState(defaultBatchId);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset all state on close
    setStep(1);
    setSelectedDate('');
    setVaccineName('Newcastle (ND)');
    setCustomVaccine('');
    setReminderEnabled(true);
    setReminderTiming('3 days before');
    setNotes('');
    setSubmitting(false);
    onClose();
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const goToStep2 = () => {
    if (!selectedDate) return;
    setStep(2);
  };

  const handleConfirm = async () => {
    const finalVaccine = vaccineName === 'Other Vaccination' && customVaccine.trim()
      ? customVaccine.trim()
      : vaccineName;

    if (!finalVaccine) return;

    setSubmitting(true);
    try {
      await onConfirm({
        batchId: selectedBatchId || defaultBatchId,
        vaccineName: finalVaccine,
        dueDate: selectedDate,
        reminderTiming: reminderEnabled ? reminderTiming : null,
        notes: notes.trim() || undefined,
      });
      handleClose();
    } catch (err) {
      console.error('VaccinationModal confirm error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={handleClose} />

      {/* Modal Panel */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden z-10 animate-fade-in">

        {/* ── STEP 1: CALENDAR ── */}
        {step === 1 && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-lg font-bold text-stone-950 font-heading">{title}</h2>
                <p className="text-xs text-stone-500 mt-0.5">Pick a vaccination date to continue.</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-9 h-9 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Batch selector — only shown when multiple batches and no default */}
            {batches.length > 1 && !defaultBatchId && (
              <div className="px-6 pt-4">
                <label className="text-xs font-bold text-stone-700 block mb-1.5">
                  Select Batch
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] cursor-pointer"
                >
                  <option value="">— Choose a batch —</option>
                  {batches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.name} ({b.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Calendar */}
            <div className="px-6 pt-5 pb-4">
              <CalendarPicker
                value={selectedDate}
                onChange={handleDateSelect}
                disablePast={false}
              />
            </div>

            {/* Selected date feedback + Next button */}
            <div className="px-6 pb-6 pt-2 border-t border-stone-100 space-y-4">
              {selectedDate ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-[#EAF5EF] border border-[#CFE8D9] rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-[#0D5C3A] text-white flex items-center justify-center shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#0D472B] uppercase tracking-wide">Selected Date</div>
                    <div className="text-sm font-bold text-[#0D472B]">{formatDisplayDate(selectedDate)}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-500 text-sm font-medium">
                  <Calendar size={16} className="text-stone-400" />
                  <span>Tap a date on the calendar above</span>
                </div>
              )}

              <button
                type="button"
                onClick={goToStep2}
                disabled={!selectedDate || (!selectedBatchId && batches.length > 1 && !defaultBatchId)}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: VACCINE DETAILS ── */}
        {step === 2 && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-stone-950 font-heading">Vaccination Details</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Confirm vaccine type and reminder.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-9 h-9 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Selected date chip */}
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#EAF5EF] border border-[#CFE8D9] rounded-2xl">
                <Calendar size={15} className="text-[#0D5C3A] shrink-0" />
                <span className="text-sm font-bold text-[#0D472B]">{formatDisplayDate(selectedDate)}</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="ml-auto text-[11px] font-bold text-[#0D5C3A] hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Vaccine Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Vaccine Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={vaccineName}
                  onChange={(e) => setVaccineName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all cursor-pointer"
                >
                  {VACCINE_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>

                {vaccineName === 'Other Vaccination' && (
                  <input
                    type="text"
                    placeholder="Enter vaccine name…"
                    value={customVaccine}
                    onChange={(e) => setCustomVaccine(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400 mt-2"
                    autoFocus
                  />
                )}
              </div>

              {/* Reminder toggle + timing */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-2xs">
                      <Bell size={15} className="text-[#0D5C3A]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">Set Reminder</div>
                      <div className="text-[11px] text-stone-500">Get notified before due date</div>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D5C3A]" />
                  </label>
                </div>

                {/* Reminder timing options — pill buttons */}
                {reminderEnabled && (
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-stone-500 mb-2 uppercase tracking-wide">
                      When to remind
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {REMINDER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setReminderTiming(opt.value)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                            reminderTiming === opt.value
                              ? 'bg-[#0D5C3A] text-white border-[#0D5C3A] shadow-xs'
                              : 'bg-white text-stone-600 border-stone-200 hover:border-[#0D5C3A]/40 hover:text-[#0D5C3A]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Notes <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Administer via drinking water in the early morning…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400 resize-none"
                />
              </div>
            </div>

            {/* Footer Confirm */}
            <div className="px-6 pb-6 pt-2 border-t border-stone-100 space-y-2">
              {/* Summary chip */}
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-700">
                <ShieldCheck size={15} className="text-[#0D5C3A] shrink-0" />
                <span>
                  <strong className="text-stone-900">
                    {vaccineName === 'Other Vaccination' && customVaccine
                      ? customVaccine
                      : vaccineName}
                  </strong>
                  {' '}on{' '}
                  <strong className="text-stone-900">{formatDisplayDate(selectedDate)}</strong>
                  {reminderEnabled && (
                    <> · Reminder <strong className="text-[#0D5C3A]">{reminderTiming}</strong></>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting || (!vaccineName) || (vaccineName === 'Other Vaccination' && !customVaccine.trim())}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#0D5C3A] hover:bg-[#094229] text-white shadow-xs"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Scheduling…
                  </span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Schedule Vaccination</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default VaccinationModal;
