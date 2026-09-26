import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBatches } from '../context/BatchContext';
import { getLogEntries, createLogEntry } from '../api/logs';
import { QUEUED_SAVE_MESSAGE } from '../lib/offlineQueue';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';

// Field definitions mirroring app.js LOG_RESOURCES exactly
const LOG_CONFIGS = {
  mortality: {
    title: 'Birds Lost',
    icon: '📉',
    resource: 'mortality',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'count', label: 'Count', type: 'number', required: true },
      { key: 'note', label: 'Note (optional)', type: 'text', fullWidth: true },
    ],
    formatEntry: (e) => ({
      title: `${e.count} bird${e.count !== 1 ? 's' : ''} lost`,
      sub: e.note || 'No note',
      date: e.date,
    }),
  },
  feed: {
    title: 'Feed Log',
    icon: '🌾',
    resource: 'feed',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'feedType', label: 'Feed type', type: 'text', required: true },
      { key: 'amountKg', label: 'Amount (kg)', type: 'number', required: true },
      { key: 'costNaira', label: 'Cost (₦)', type: 'number', required: true },
    ],
    formatEntry: (e) => ({
      title: `${e.feedType} — ${e.amountKg} kg`,
      sub: `₦${Number(e.costNaira).toLocaleString()}`,
      date: e.date,
    }),
  },
  eggs: {
    title: 'Egg Production',
    icon: '🥚',
    resource: 'eggs',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'crates', label: 'Crates', type: 'number', required: true },
      { key: 'looseEggs', label: 'Loose eggs', type: 'number' },
      { key: 'revenueNaira', label: 'Revenue (₦, optional)', type: 'number' },
    ],
    formatEntry: (e) => ({
      title: `${e.crates} crate${e.crates !== 1 ? 's' : ''}${e.looseEggs ? ` + ${e.looseEggs} loose` : ''}`,
      sub: e.revenueNaira ? `₦${Number(e.revenueNaira).toLocaleString()} revenue` : 'No revenue logged',
      date: e.date,
    }),
  },
  vaccinations: {
    title: 'Vaccination History',
    icon: '💉',
    resource: 'vaccinations',
    fields: [
      { key: 'vaccineName', label: 'Vaccine name', type: 'text', required: true },
      { key: 'dateAdministered', label: 'Date given', type: 'date', required: true },
      { key: 'costNaira', label: 'Cost (₦, optional)', type: 'number' },
    ],
    formatEntry: (e) => ({
      title: e.vaccineName,
      sub: e.costNaira ? `₦${Number(e.costNaira).toLocaleString()}` : 'No cost logged',
      date: e.dateAdministered,
    }),
  },
};

export function LogPage({ logType, onNavigate }) {
  const config = LOG_CONFIGS[logType];
  const { currentBatchId, currentBatch, hasBatches } = useBatches();
  const toast = useToast();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Initialize form with today's date for date fields
  const resetForm = useCallback(() => {
    const defaults = {};
    config.fields.forEach(f => {
      if (f.type === 'date') defaults[f.key] = new Date().toISOString().slice(0, 10);
      else defaults[f.key] = '';
    });
    setFormValues(defaults);
    setErrors({});
  }, [logType, config.fields]);

  useEffect(() => { resetForm(); }, [resetForm]);

  // Load entries
  useEffect(() => {
    if (!currentBatchId) return;
    let cancelled = false;
    setLoading(true);
    getLogEntries(currentBatchId, config.resource)
      .then(data => { if (!cancelled) setEntries(data.entries || []); })
      .catch(e => console.error(e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentBatchId, logType, config.resource]);

  if (!hasBatches) {
    return (
      <div className="text-center py-12 px-4 bg-white rounded-3xl border border-stone-200 shadow-xs">
        <div className="w-14 h-14 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center text-2xl mb-3">
          🐔
        </div>
        <h3 className="text-lg font-bold text-stone-900 font-heading mb-1">Create a batch first</h3>
        <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto mb-6">
          You need at least one batch of birds before you can log daily entries.
        </p>
        <Link
          to="/batches"
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer inline-block"
        >
          Go to Batches
        </Link>
      </div>
    );
  }

  if (!currentBatchId) {
    return (
      <div className="text-center py-12 px-4 bg-white rounded-3xl border border-stone-200 shadow-xs">
        <div className="w-14 h-14 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center text-2xl mb-3">
          👆
        </div>
        <h3 className="text-lg font-bold text-stone-900 font-heading mb-1">Select a batch</h3>
        <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto">
          Use the batch selector in the top bar to choose which flock batch to log for.
        </p>
      </div>
    );
  }

  const setField = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    config.fields.forEach(f => {
      if (f.required && !formValues[f.key]?.toString().trim()) {
        newErrors[f.key] = `${f.label} is required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const body = {};
      config.fields.forEach(f => {
        const val = formValues[f.key];
        if (val === '' || val == null) return;
        body[f.key] = f.type === 'number' ? Number(val) : val;
      });
      const created = await createLogEntry(currentBatchId, config.resource, body);
      resetForm();
      // A queued entry isn't on the server yet, so re-fetching would fail and
      // report a save failure for something that was saved locally just fine.
      if (created?.queued) {
        toast(QUEUED_SAVE_MESSAGE, 'success');
        setEntries((prev) => [created, ...prev]);
      } else {
        toast('Entry saved successfully', 'success');
        const data = await getLogEntries(currentBatchId, config.resource);
        setEntries(data.entries || []);
      }
    } catch (e) {
      toast(e.message || 'Failed to save entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 font-heading flex items-center gap-2">
          <span>{config.icon}</span>
          <span>{config.title}</span>
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Flock batch: <span className="font-semibold text-stone-800">{currentBatch?.name || currentBatchId}</span>
        </p>
      </div>

      {/* Entry Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-5">
        <div className="text-sm font-bold text-stone-900 font-heading flex items-center gap-2 pb-1 border-b border-stone-100">
          <span>+</span>
          <span>Add New Record</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.fields.map(f => (
            <div key={f.key} className={`space-y-1.5 ${f.fullWidth ? 'sm:col-span-2' : ''}`}>
              <label className="text-xs font-semibold text-stone-700 block" htmlFor={`log-${f.key}`}>
                {f.label}
              </label>
              <input
                id={`log-${f.key}`}
                className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-stone-900 text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-amber-500/30 transition-all ${
                  errors[f.key] ? 'border-rose-400 focus:border-rose-500' : 'border-stone-300 focus:border-amber-500'
                }`}
                type={f.type}
                value={formValues[f.key] || ''}
                onChange={e => setField(f.key, e.target.value)}
                disabled={submitting}
              />
              {errors[f.key] && (
                <div className="text-[11px] text-rose-600 font-medium">{errors[f.key]}</div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="spinner !w-4 !h-4 !border-white/40 !border-t-white" />
                <span>Saving…</span>
              </>
            ) : (
              <span>Save Record</span>
            )}
          </button>
        </div>
      </div>

      {/* Previous Entries List */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
          Previous Records ({entries.length})
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8 gap-3 text-stone-400 text-sm">
            <div className="spinner" />
            <span>Loading records…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
            No records logged yet. Add your first entry above.
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(e => {
              const display = config.formatEntry(e);
              return (
                <div
                  key={e.entryId}
                  className="bg-white rounded-2xl p-4 border border-stone-200 hover:border-stone-300 transition-colors flex items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-sm font-bold text-stone-900 truncate">
                      {display.title}
                    </div>
                    <div className="text-xs text-stone-500 truncate">
                      {display.sub}
                    </div>
                  </div>
                  <div className="text-xs font-mono font-medium text-stone-400 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200 shrink-0">
                    {display.date}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      <Modal
        open={confirmOpen}
        title="Confirm Record Entry"
        onClose={() => setConfirmOpen(false)}
        actions={
          <>
            <button
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              onClick={handleConfirm}
            >
              Confirm &amp; Save
            </button>
          </>
        }
      >
        Are you sure you want to save this {config.title.toLowerCase()} record for{' '}
        <span className="font-semibold text-stone-900">{currentBatch?.name || 'this batch'}</span>?
      </Modal>
    </div>
  );
}
