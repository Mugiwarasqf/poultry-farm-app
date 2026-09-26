import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBatches } from '../context/BatchContext';
import { getSchedule, createScheduleItem, updateScheduleItem } from '../api/schedule';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';

export function SchedulePage() {
  const { currentBatchId, currentBatch, hasBatches } = useBatches();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vaccineName, setVaccineName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [markDoneId, setMarkDoneId] = useState(null);

  const loadSchedule = async () => {
    if (!currentBatchId) return;
    setLoading(true);
    try {
      const data = await getSchedule(currentBatchId);
      setItems(data.schedule || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSchedule(); }, [currentBatchId]);

  if (!hasBatches) {
    return (
      <div className="text-center py-12 px-4 bg-white rounded-3xl border border-stone-200 shadow-xs">
        <div className="w-14 h-14 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center text-2xl mb-3">
          🐔
        </div>
        <h3 className="text-lg font-bold text-stone-900 font-heading mb-1">Create a batch first</h3>
        <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto mb-6">
          You need at least one batch before managing vaccination schedules.
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

  const handleSubmit = async () => {
    const newErrors = {};
    if (!vaccineName.trim()) newErrors.vaccineName = 'Vaccine name is required';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      await createScheduleItem(currentBatchId, { vaccineName: vaccineName.trim(), dueDate });
      toast('Vaccination scheduled', 'success');
      setVaccineName('');
      setDueDate('');
      await loadSchedule();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleMarkDone = async () => {
    if (!markDoneId) return;
    try {
      await updateScheduleItem(currentBatchId, markDoneId, { status: 'done' });
      toast('Vaccination marked as done', 'success');
      setMarkDoneId(null);
      await loadSchedule();
    } catch (e) { toast(e.message, 'error'); }
  };

  const upcoming = items.filter(i => i.status === 'upcoming');
  const done = items.filter(i => i.status === 'done');
  const missed = items.filter(i => i.status === 'missed');

  const renderStatusBadge = (status) => {
    const badgeConfig = {
      done: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      missed: 'bg-rose-100 text-rose-800 border-rose-200',
      upcoming: 'bg-amber-100 text-amber-900 border-amber-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${badgeConfig[status] || 'bg-stone-100 text-stone-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 font-heading flex items-center gap-2">
          <span>📅</span>
          <span>Vaccination Schedule</span>
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Flock batch: <span className="font-semibold text-stone-800">{currentBatch?.name || currentBatchId}</span>
        </p>
      </div>

      {/* Add vaccination card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-5">
        <div className="text-sm font-bold text-stone-900 font-heading flex items-center gap-2 pb-1 border-b border-stone-100">
          <span>+</span>
          <span>Schedule a Vaccination</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 block">
              Vaccine Name
            </label>
            <input
              className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-stone-900 text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-amber-500/30 transition-all ${
                errors.vaccineName ? 'border-rose-400 focus:border-rose-500' : 'border-stone-300 focus:border-amber-500'
              }`}
              type="text"
              placeholder="e.g. Newcastle / Gumboro (1st dose)"
              value={vaccineName}
              onChange={e => {
                setVaccineName(e.target.value);
                setErrors(p => ({ ...p, vaccineName: '' }));
              }}
            />
            {errors.vaccineName && (
              <div className="text-[11px] text-rose-600 font-medium">{errors.vaccineName}</div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 block">
              Due Date
            </label>
            <input
              className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-stone-900 text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-amber-500/30 transition-all ${
                errors.dueDate ? 'border-rose-400 focus:border-rose-500' : 'border-stone-300 focus:border-amber-500'
              }`}
              type="date"
              value={dueDate}
              onChange={e => {
                setDueDate(e.target.value);
                setErrors(p => ({ ...p, dueDate: '' }));
              }}
            />
            {errors.dueDate && (
              <div className="text-[11px] text-rose-600 font-medium">{errors.dueDate}</div>
            )}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Adding…' : 'Add to Schedule'}
          </button>
        </div>
      </div>

      {/* Schedule list */}
      {loading ? (
        <div className="flex items-center justify-center p-8 gap-3 text-stone-400 text-sm">
          <div className="spinner" />
          <span>Loading schedule…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
          No vaccinations scheduled yet for this batch.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                <span>⏳</span>
                <span>Upcoming Due ({upcoming.length})</span>
              </div>
              <div className="space-y-2">
                {upcoming.map(item => (
                  <div
                    key={item.scheduleId}
                    className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-stone-900">{item.vaccineName}</div>
                      <div className="text-xs text-stone-500">Scheduled Due: <span className="font-semibold text-stone-800">{item.dueDate}</span></div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {renderStatusBadge(item.status)}
                      <button
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        onClick={() => setMarkDoneId(item.scheduleId)}
                      >
                        ✓ Mark Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                <span>✓</span>
                <span>Administered ({done.length})</span>
              </div>
              <div className="space-y-2">
                {done.map(item => (
                  <div
                    key={item.scheduleId}
                    className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex items-center justify-between gap-3 opacity-80"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-stone-900 line-through text-stone-600">{item.vaccineName}</div>
                      <div className="text-xs text-stone-400">Due date: {item.dueDate}</div>
                    </div>
                    {renderStatusBadge(item.status)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missed */}
          {missed.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-2">
                <span>✕</span>
                <span>Missed ({missed.length})</span>
              </div>
              <div className="space-y-2">
                {missed.map(item => (
                  <div
                    key={item.scheduleId}
                    className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs flex items-center justify-between gap-3 bg-rose-50/30"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-rose-950">{item.vaccineName}</div>
                      <div className="text-xs text-rose-700">Missed deadline: {item.dueDate}</div>
                    </div>
                    {renderStatusBadge(item.status)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      <Modal
        open={!!markDoneId}
        title="Mark Vaccine as Completed?"
        onClose={() => setMarkDoneId(null)}
        actions={
          <>
            <button
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              onClick={() => setMarkDoneId(null)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              onClick={handleMarkDone}
            >
              Confirm Administered
            </button>
          </>
        }
      >
        This will record that this vaccination has been administered to your birds.
      </Modal>
    </div>
  );
}
