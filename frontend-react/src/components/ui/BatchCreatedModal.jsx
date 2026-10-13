import { useEffect, useRef } from 'react';
import { ArrowRight, Check, TriangleAlert } from 'lucide-react';
import { Confetti } from './Confetti';
import { batchImage, birdTypeLabel } from '../../lib/batch';

/**
 * Shown once a batch has been created: a short celebration (confetti and a
 * check that pops in), what was set up, and where to go next. Escape or the
 * backdrop opens the new batch, the natural next step.
 *
 * @param {{ batch: { batchId, name, type, birdCount, breed, penName }, vaccinations: number,
 *   failedVaccinations: number, onOpenBatch: () => void, onDashboard: () => void }} props
 */
export function BatchCreatedModal({ batch, vaccinations, failedVaccinations, onOpenBatch, onDashboard }) {
  const primaryRef = useRef(null);

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onOpenBatch();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onOpenBatch]);

  const scheduled = vaccinations - failedVaccinations;
  const facts = [
    { label: 'Birds', value: Number(batch.birdCount).toLocaleString() },
    { label: 'Breed', value: batch.breed },
    { label: 'Pen', value: batch.penName },
    { label: 'Vaccinations', value: scheduled > 0 ? `${scheduled} scheduled` : 'None yet' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="batch-created-title">
      <Confetti />
      <div className="absolute inset-0 bg-[#17191A]/55 backdrop-blur-sm celebrate-fade" onClick={onOpenBatch} />

      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden celebrate-rise">
        {/* Photo header with the check badge overlapping it */}
        <div className="relative h-32 bg-stone-100">
          <img src={batchImage(batch)} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white/90 text-[11px] font-semibold text-[#17191A]">
            {birdTypeLabel(batch.type)}
          </span>
        </div>
        <div className="relative -mt-9 flex justify-center">
          <span className="celebrate-pop w-[72px] h-[72px] rounded-full bg-[#DFFF83] ring-[6px] ring-white shadow-lg flex items-center justify-center">
            <Check size={34} strokeWidth={3} className="text-[#17191A]" />
          </span>
        </div>

        <div className="px-6 pt-4 pb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4D6600]">Batch created</p>
          <h2 id="batch-created-title" className="mt-1.5 text-2xl font-semibold text-[#142033] font-heading">
            {batch.name} is ready
          </h2>
          <p className="mt-1.5 text-sm text-[#70829B]">Start logging feed, losses and vaccinations from its page.</p>

          <dl className="mt-5 grid grid-cols-2 gap-px rounded-lg overflow-hidden border border-[#E1E8EF] bg-[#E1E8EF] text-left">
            {facts.map((f) => (
              <div key={f.label} className="bg-white px-3.5 py-2.5">
                <dt className="text-[11px] text-[#70829B]">{f.label}</dt>
                <dd className="text-sm font-semibold text-[#142033] truncate">{f.value}</dd>
              </div>
            ))}
          </dl>

          {failedVaccinations > 0 && (
            <p className="mt-3 flex items-start gap-2 text-left text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <TriangleAlert size={14} className="shrink-0 mt-0.5" />
              {failedVaccinations} vaccination{failedVaccinations === 1 ? '' : 's'} couldn't be scheduled. Add{' '}
              {failedVaccinations === 1 ? 'it' : 'them'} from the batch's Vaccination tab.
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onDashboard}
              className="flex-1 px-4 py-3 rounded-lg border border-[#E1E8EF] text-sm font-semibold text-[#142033] hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Back to dashboard
            </button>
            <button
              ref={primaryRef}
              type="button"
              onClick={onOpenBatch}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#DFFF83] hover:bg-[#C5E95A] text-sm font-semibold text-[#17191A] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B7DA3E] focus-visible:ring-offset-2"
            >
              Open batch <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchCreatedModal;
