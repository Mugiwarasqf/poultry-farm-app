import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Check, Info, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { BirdIcon } from '../components/ui/BirdIcon';
import { useBatches } from '../context/BatchContext';
import { useAuth } from '../context/AuthContext';
import { createSchedule } from '../api/schedule';
import { useToast } from '../components/ui/Toast';
import { BIRD_PURPOSES, allBirdTypes, batchAge, batchImage, birdPurpose, birdTypeLabel, formatDate, laysEggs } from '../lib/batch';
import { BatchCreatedModal } from '../components/ui/BatchCreatedModal';
import { DOSE_NUMBERS, ROUTES, findVaccine, vaccinesFor } from '../lib/vaccines';
import { pensInUse } from '../lib/pens';
import { OTHER_BREED, breedsFor } from '../lib/breeds';
import { toIso } from '../lib/supplements';
import { VaccineIcon } from '../components/ui/VaccineIcon';
import { BellIcon } from '../components/ui/BellIcon';

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Birds & Housing' },
  { id: 3, label: 'Vaccination' },
  { id: 4, label: 'Review' },
];

const OTHER_VACCINE = 'Other vaccine';

let rowSeq = 0;
/** One planned vaccination in the create form. */
function newVaccinationRow(dueDate = '') {
  rowSeq += 1;
  return { key: `v${rowSeq}`, vaccineName: '', customName: '', dueDate, doseNumber: '' };
}

const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toIso(d);
};

// ---- review step pieces -------------------------------------------------------

/** One block of the review, mirroring a step of the form, with a way back to it. */
function ReviewSection({ title, onEdit, children }) {
  return (
    <section className="rounded-lg border border-[#E1E8EF] bg-white">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#E1E8EF]">
        <h3 className="text-sm font-semibold text-[#142033]">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-[#4D6600] hover:text-[#3A4D00] hover:underline cursor-pointer"
        >
          Edit
        </button>
      </div>
      <div className="px-4 sm:px-5 py-4">{children}</div>
    </section>
  );
}

/** Label/value pairs; empty values read "Not set" so nothing silently disappears. */
function ReviewFacts({ items }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
      {items.map((f) => (
        <div key={f.label} className={f.wide ? 'col-span-2 sm:col-span-3' : ''}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-[#70829B]">{f.label}</dt>
          <dd className={`mt-1 text-sm ${f.value ? 'font-semibold text-[#142033]' : 'text-[#70829B]'}`}>{f.value || 'Not set'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CreateBatchPage() {
  const navigate = useNavigate();
  const { batches, createBatch } = useBatches();
  const { farm } = useAuth();
  const toast = useToast();
  const today = toIso(new Date());

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // Set once the batch is saved; opens the "batch created" celebration.
  const [created, setCreated] = useState(null);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [birdType, setBirdType] = useState('layer'); // built-in or the farm's own type id
  const [birdCount, setBirdCount] = useState('');
  // Breed: picked from the list for the bird type, or typed when "Other".
  const [breedChoice, setBreedChoice] = useState('');
  const [customBreed, setCustomBreed] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [penId, setPenId] = useState('');
  const [housing, setHousing] = useState(''); // free text, only when the farm has no pens set up
  const [ageValue, setAgeValue] = useState('1');
  const [ageUnit, setAgeUnit] = useState('weeks'); // 'days' | 'weeks'

  // Step 2: Birds & Housing
  const [hatchery, setHatchery] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [notes, setNotes] = useState('');

  // Step 3: Vaccination — as many as the farmer wants to plan up front.
  const [vaccinations, setVaccinations] = useState(() => [newVaccinationRow(plusDays(7))]);

  const pens = farm?.pens || [];
  const penUsage = useMemo(() => pensInUse(pens, batches), [pens, batches]);
  const selectedPen = pens.find((p) => p.id === penId);
  const purpose = birdPurpose(birdType);
  const breedList = useMemo(() => breedsFor(birdType), [birdType]);
  const breedName = breedChoice === OTHER_BREED ? customBreed.trim() : breedChoice;
  const penName = selectedPen?.name || housing.trim();
  const vaccineOptions = useMemo(() => vaccinesFor(birdType), [birdType]);

  const updateVaccination = (key, field, value) =>
    setVaccinations((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const removeVaccination = (key) => setVaccinations((rows) => rows.filter((r) => r.key !== key));
  const addVaccination = () => {
    // Default the new row a week after the last one, which is the usual gap.
    const last = vaccinations[vaccinations.length - 1]?.dueDate;
    const next = last ? new Date(`${last}T00:00:00`) : new Date();
    next.setDate(next.getDate() + 7);
    setVaccinations((rows) => [...rows, newVaccinationRow(toIso(next))]);
  };

  const vaccineNameOf = (row) => (row.vaccineName === OTHER_VACCINE ? row.customName.trim() : row.vaccineName);
  // Rows the farmer actually filled in; a blank row is simply ignored.
  const plannedVaccinations = vaccinations.filter((r) => vaccineNameOf(r) && r.dueDate);

  const nextStep = () => {
    if (currentStep === 1) {
      if (!name.trim()) return toast('Please enter a batch name', 'error');
      if (!startDate) return toast('Please select date placed', 'error');
    }
    if (currentStep === 2) {
      if (!birdCount || Number(birdCount) <= 0) return toast('Please enter a valid bird count', 'error');
      if (!breedChoice) return toast('Please choose a breed', 'error');
      if (breedChoice === OTHER_BREED && !customBreed.trim()) return toast('Enter the breed name', 'error');
      if (!penName) return toast(pens.length > 0 ? 'Please select a pen' : 'Please enter the pen or house name', 'error');
    }
    if (currentStep === 3) {
      const half = vaccinations.find((r) => (r.vaccineName || r.customName) && !r.dueDate);
      if (half) return toast('Pick a date for each vaccination, or remove the row', 'error');
      const missingName = vaccinations.find((r) => r.vaccineName === OTHER_VACCINE && !r.customName.trim());
      if (missingName) return toast('Enter the name of the other vaccine', 'error');
      const noDose = vaccinations.find((r) => (r.vaccineName || r.customName) && !r.doseNumber);
      if (noDose) return toast('Pick a dose for each vaccination, or remove the row', 'error');
    }
    setCurrentStep(s => Math.min(s + 1, 4));
  };

  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

  const handleFinish = async () => {
    setLoading(true);
    try {
      const calculatedAgeWeeks = ageUnit === 'days' ? Math.round(Number(ageValue) / 7) : Number(ageValue);

      // 1. Create the batch in backend
      const newBatch = await createBatch({
        name: name.trim(),
        type: birdType,
        startDate,
        birdCount: Number(birdCount),
        breed: breedName,
        // housing keeps the pen's name too, so older screens still show it.
        housing: penName,
        penId: selectedPen?.id || undefined,
        hatchery: hatchery.trim() || undefined,
        targetWeightKg: Number(targetWeight) > 0 ? Number(targetWeight) : undefined,
        purchaseCostNaira: Number(purchaseCost) > 0 ? Number(purchaseCost) : undefined,
        initialAgeWeeks: calculatedAgeWeeks || 0,
        notes: notes.trim() || undefined,
      });

      // 2. Every planned vaccination goes on the schedule.
      let failed = 0;
      if (newBatch.batchId) {
        const results = await Promise.allSettled(
          plannedVaccinations.map((r) => {
            const vaccine = findVaccine(r.vaccineName);
            return createSchedule(newBatch.batchId, {
              vaccineName: vaccineNameOf(r),
              dueDate: r.dueDate,
              doseNumber: r.doseNumber,
              ...(vaccine?.route ? { route: vaccine.route } : {}),
            });
          })
        );
        failed = results.filter((x) => x.status === 'rejected').length;
      }

      // Celebrate, then let the farmer choose where to go (see BatchCreatedModal).
      setCreated({
        batch: { batchId: newBatch.batchId, name: name.trim(), type: birdType, birdCount: Number(birdCount), breed: breedName, penName },
        vaccinations: plannedVaccinations.length,
        failedVaccinations: failed,
      });
    } catch (e) {
      toast(e.message || 'Failed to create batch', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header with Back Arrow matching reference image */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-2 rounded-full hover:bg-stone-100 text-stone-600 hover:text-stone-950 transition-colors"
          aria-label="Back to home"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-950 font-heading">
            Create New Batch
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Set up flock details, housing, and vaccination schedules.
          </p>
        </div>
      </div>

      {/* Step Progress Indicator (Matching Reference Image) */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="grid grid-cols-4 gap-2 text-xs">
          {STEPS.map(step => {
            const isDone = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-[#DFFF83] text-[#17191A] shadow-xs'
                      : isDone
                      ? 'bg-[#DFFF83] text-[#17191A]'
                      : 'bg-stone-100 text-stone-400 border border-stone-200'
                  }`}
                >
                  {isDone ? <Check size={14} /> : step.id}
                </div>
                <span
                  className={`font-semibold truncate hidden sm:inline ${
                    isCurrent ? 'text-[#4D6600]' : isDone ? 'text-stone-700' : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-stone-950 font-heading">1. Basic Information</h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Provide the basic details about your batch.
            </p>
          </div>

          <div className="space-y-5">
            {/* Batch Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Batch Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Layer Batch 1"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400"
                autoFocus
              />
            </div>

            {/* Bird Type + Mandatory Egg Production Callout Card (Matching Reference Image) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Bird Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={birdType}
                  onChange={e => {
                    setBirdType(e.target.value);
                    // Breeds differ per bird type, so the old pick no longer applies.
                    setBreedChoice('');
                    setCustomBreed('');
                  }}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all cursor-pointer"
                >
                  {allBirdTypes().map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <Link to="/settings/farm" className="inline-block text-[11px] font-semibold text-[#4D6600] hover:underline">
                  Keep a bird that isn't listed? Add it in Farm Details
                </Link>

                <div className="flex items-center gap-2 pt-1 text-xs">
                  {laysEggs(birdType) ? (
                    <span className="text-[#4D6600] font-semibold flex items-center gap-1">
                      <Check size={14} /> Egg production available
                    </span>
                  ) : (
                    <span className="text-stone-500 flex items-center gap-1">
                      <Info size={14} /> No egg tracking for {birdTypeLabel(birdType)} batches
                    </span>
                  )}
                </div>
              </div>

              {/* Egg Rule Callout Card (Matching Reference Image right side) */}
              <div className="lg:col-span-5 bg-[#FFF9F2] border border-[#FEEAD1] rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
                <div className="p-2 rounded-xl bg-white shadow-2xs shrink-0 text-[#B45309]">
                  <BirdIcon size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-950">
                    {birdTypeLabel(birdType)}: raised for {BIRD_PURPOSES.find((p) => p.value === purpose)?.label.toLowerCase()}
                  </h4>
                  <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                    {purpose === 'eggs'
                      ? 'Egg collection is tracked, and performance is judged on how many eggs the flock lays.'
                      : purpose === 'meat'
                      ? 'Performance is judged on sales and profit when you complete the batch, and on growth and survival before then.'
                      : purpose === 'dual'
                      ? 'Eggs are tracked, and performance looks at both egg output and sales when the batch is complete.'
                      : 'Performance is judged on how many birds survive and what each one costs to raise.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Date Placed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Date Placed / Acquired <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={nextStep}
              className="px-8 py-3 bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] font-bold rounded-xl text-sm transition-all duration-150 inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Birds & Housing */}
      {currentStep === 2 && (
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-stone-950 font-heading">2. Birds &amp; Housing</h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Provide relevant information about the birds and where they are kept.
            </p>
          </div>

          <div className="space-y-5">
            {/* Number of Birds & Age */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Number of Birds <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={birdCount}
                  onChange={e => setBirdCount(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Age of Birds (at placement)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 24"
                    value={ageValue}
                    onChange={e => setAgeValue(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400"
                  />
                  <select
                    value={ageUnit}
                    onChange={e => setAgeUnit(e.target.value)}
                    className="px-3 py-3 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="weeks">Weeks</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Breed */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Breed <span className="text-rose-500">*</span>
              </label>
              <select
                value={breedChoice}
                onChange={e => setBreedChoice(e.target.value)}
                className={`w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all cursor-pointer ${
                  breedChoice ? 'text-stone-900' : 'text-stone-400'
                }`}
              >
                <option value="" disabled>
                  Select a {birdTypeLabel(birdType).toLowerCase()} breed
                </option>
                {breedList.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
                <option value={OTHER_BREED}>Other (type it)</option>
              </select>
              {breedChoice === OTHER_BREED && (
                <input
                  type="text"
                  placeholder="Type the breed name"
                  value={customBreed}
                  onChange={e => setCustomBreed(e.target.value)}
                  autoFocus
                  className="w-full mt-2 px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400"
                />
              )}
            </div>

            {/* Pen — picked from the farm's pens; free text only until pens are set up */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Pen / House <span className="text-rose-500">*</span>
              </label>
              {pens.length > 0 ? (
                <select
                  value={penId}
                  onChange={e => setPenId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all cursor-pointer"
                >
                  <option value="" disabled>Select a pen</option>
                  {pens.map((p) => {
                    const inPen = penUsage.get(p.id) || [];
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {inPen.length ? ` (in use: ${inPen.map((b) => b.name).join(', ')})` : ' (free)'}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="e.g. Pen A, House 2"
                    value={housing}
                    onChange={e => setHousing(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400"
                  />
                  <Link to="/settings/farm" className="inline-block text-[11px] font-semibold text-[#4D6600] hover:underline">
                    Set up your pens in Farm Details to pick from a list
                  </Link>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Source Hatchery / Supplier (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. CHI Farms, Zartech, Amo Hatchery"
                value={hatchery}
                onChange={e => setHatchery(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Cost of the Birds (₦, optional)
              </label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="e.g. 450000 for all the birds"
                value={purchaseCost}
                onChange={e => setPurchaseCost(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400"
              />
              <p className="text-[11px] text-stone-500">
                What you paid for the whole batch. Needed to work out profit when the batch is complete.
              </p>
            </div>

            {(purpose === 'meat' || purpose === 'dual') && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Target Slaughter Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 2.5"
                  value={targetWeight}
                  onChange={e => setTargetWeight(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Notes
              </label>
              <textarea
                rows={3}
                placeholder="Batch specific notes or additional instructions..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] transition-all placeholder:text-stone-400"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold rounded-xl text-sm transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-8 py-3 bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] font-bold rounded-xl text-sm transition-all duration-150 inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Vaccination — any number of planned vaccinations */}
      {currentStep === 3 && (
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-stone-950 font-heading">3. Vaccination</h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Plan the vaccinations you already know about. Add as many as you need; you can add more later too.
            </p>
          </div>

          <div className="bg-[#F7FFE0] border border-[#E3F5A8] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-white text-[#4D6600] flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#3A4D00]">Keep your birds healthy</h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Each one goes on the schedule, with an email reminder 3 days before and on the day.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {vaccinations.length === 0 && (
              <p className="text-sm text-stone-500 text-center py-4 border border-dashed border-stone-300 rounded-2xl">
                No vaccinations planned. You can add them later from the batch's Vaccination tab.
              </p>
            )}

            {vaccinations.map((row, index) => {
              const vaccine = findVaccine(row.vaccineName);
              const isOther = row.vaccineName === OTHER_VACCINE;
              return (
                <div key={row.key} className="border border-stone-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-stone-800">
                      <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center text-[11px]">{index + 1}</span>
                      Vaccination {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVaccination(row.key)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-rose-600 cursor-pointer"
                      aria-label={`Remove vaccination ${index + 1}`}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-700 block">Vaccine</label>
                      <select
                        value={row.vaccineName}
                        onChange={e => updateVaccination(row.key, 'vaccineName', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] cursor-pointer"
                      >
                        <option value="">Choose a vaccine</option>
                        {vaccineOptions.map((v) => (
                          <option key={v.id} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                      {isOther && (
                        <input
                          type="text"
                          placeholder="Vaccine name"
                          value={row.customName}
                          onChange={e => updateVaccination(row.key, 'customName', e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] placeholder:text-stone-400"
                        />
                      )}
                    </div>
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-700 block">Due date</label>
                      <input
                        type="date"
                        min={today}
                        value={row.dueDate}
                        onChange={e => updateVaccination(row.key, 'dueDate', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E]"
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-700 block">Dose <span className="text-rose-500">*</span></label>
                      <select
                        value={row.doseNumber}
                        onChange={e => updateVaccination(row.key, 'doseNumber', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#DFFF83]/70 focus:border-[#B7DA3E] cursor-pointer"
                      >
                        <option value="">Select dose</option>
                        {DOSE_NUMBERS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  {vaccine && !isOther && (
                    <p className="text-[11px] text-stone-500 flex items-start gap-1.5">
                      <Info size={12} className="shrink-0 mt-0.5 text-[#4D6600]" />
                      <span>
                        {ROUTES[vaccine.route]?.label}
                        {vaccine.typicalAge ? ` · usually ${vaccine.typicalAge.charAt(0).toLowerCase()}${vaccine.typicalAge.slice(1)}` : ''}
                      </span>
                    </p>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addVaccination}
              className="w-full py-3 rounded-2xl border border-dashed border-[#D2EC7A] text-sm font-semibold text-[#4D6600] hover:bg-[#F7FFE0] transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add another vaccination
            </button>
          </div>

          <div className="flex justify-between pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold rounded-xl text-sm transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-8 py-3 bg-[#DFFF83] hover:bg-[#C5E95A] text-[#17191A] font-bold rounded-xl text-sm transition-all duration-150 inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Confirm */}
      {currentStep === 4 && (() => {
        const initialWeeks = ageUnit === 'days' ? Math.round(Number(ageValue) / 7) : Number(ageValue) || 0;
        const ageToday = batchAge({ startDate, initialAgeWeeks: initialWeeks });
        const birds = Number(birdCount) || 0;
        const cost = Number(purchaseCost) || 0;
        const costPerBird = cost > 0 && birds > 0 ? Math.round(cost / birds) : null;
        const purposeLabel = BIRD_PURPOSES.find((p) => p.value === purpose)?.label;
        const dayOfBatch = (iso) => Math.round((new Date(`${iso}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / 86400000);
        const timeline = [...plannedVaccinations].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        const stats = [
          { label: 'Flock size', value: birds.toLocaleString(), unit: 'birds' },
          { label: 'Age today', value: ageToday },
          { label: 'Cost per bird', value: costPerBird ? `₦${costPerBird.toLocaleString()}` : '—' },
          { label: 'Vaccinations planned', value: String(timeline.length) },
        ];

        return (
          <div className="space-y-5 animate-fade-in">
            {/* Summary hero */}
            <div className="rounded-xl overflow-hidden border border-[#E1E8EF] bg-white">
              <div className="relative h-44 sm:h-52">
                <img src={batchImage({ type: birdType })} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#17191A]/85 via-[#17191A]/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-[#DFFF83] text-[11px] font-semibold text-[#17191A]">
                      {birdTypeLabel(birdType)}
                    </span>
                    {purposeLabel && (
                      <span className="px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-sm text-[11px] font-medium">{purposeLabel}</span>
                    )}
                  </div>
                  <h2 className="mt-2.5 text-2xl sm:text-3xl font-semibold font-heading leading-tight">{name.trim()}</h2>
                  <p className="mt-1 text-sm text-white/80">
                    {breedName} · {penName} · Placed {formatDate(startDate)}
                  </p>
                </div>
              </div>

              {/* Key numbers */}
              <dl className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#E1E8EF]">
                {stats.map((s) => (
                  <div key={s.label} className="px-4 sm:px-5 py-4">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-[#70829B]">{s.label}</dt>
                    <dd className="mt-1 text-xl font-semibold text-[#142033] font-heading tabular-nums">
                      {s.value}
                      {s.unit && <span className="ml-1 text-xs font-medium text-[#70829B]">{s.unit}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Step-by-step details, each with a way back */}
            <ReviewSection title="Basic info" onEdit={() => setCurrentStep(1)}>
              <ReviewFacts
                items={[
                  { label: 'Batch name', value: name.trim() },
                  { label: 'Bird type', value: birdTypeLabel(birdType) },
                  { label: 'Date placed', value: formatDate(startDate) },
                ]}
              />
            </ReviewSection>

            <ReviewSection title="Birds & housing" onEdit={() => setCurrentStep(2)}>
              <ReviewFacts
                items={[
                  { label: 'Number of birds', value: `${birds.toLocaleString()} birds` },
                  { label: 'Breed', value: breedName },
                  { label: 'Pen / house', value: penName },
                  { label: 'Age when placed', value: `${ageValue} ${ageUnit}` },
                  { label: 'Hatchery / supplier', value: hatchery.trim() },
                  { label: 'Cost of birds', value: cost > 0 ? `₦${cost.toLocaleString()}` : '' },
                  ...(purpose === 'meat' || purpose === 'dual'
                    ? [{ label: 'Target weight', value: Number(targetWeight) > 0 ? `${targetWeight} kg` : '' }]
                    : []),
                  ...(notes.trim() ? [{ label: 'Notes', value: notes.trim(), wide: true }] : []),
                ]}
              />
            </ReviewSection>

            <ReviewSection title="Vaccination plan" onEdit={() => setCurrentStep(3)}>
              {timeline.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-[#70829B]">
                  <span className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                    <VaccineIcon size={16} />
                  </span>
                  None planned yet. You can add vaccinations later from the batch&apos;s Vaccination tab.
                </div>
              ) : (
                <>
                  <ol className="relative ml-1.5 border-l border-[#E1E8EF] space-y-4">
                    {timeline.map((r) => {
                      const day = dayOfBatch(r.dueDate);
                      return (
                        <li key={r.key} className="relative pl-5">
                          <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#B7DA3E] ring-4 ring-white" />
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                            <span className="text-sm font-semibold text-[#142033]">
                              {vaccineNameOf(r)}
                              {r.doseNumber && <span className="font-normal text-[#70829B]"> · {r.doseNumber}</span>}
                            </span>
                            <span className="text-xs text-[#70829B] tabular-nums">
                              {formatDate(r.dueDate)}
                              {day >= 0 && ` · Day ${day} of batch`}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  <p className="mt-4 text-xs text-[#70829B] inline-flex items-center gap-1.5">
                    <BellIcon size={12} /> You&apos;ll get a reminder 3 days before each one and on the day.
                  </p>
                </>
              )}
            </ReviewSection>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-3 border border-[#E1E8EF] hover:bg-stone-50 text-[#142033] font-semibold rounded-lg text-sm transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={loading || Boolean(created)}
                className="px-8 py-3 bg-[#DFFF83] hover:bg-[#C5E95A] active:bg-[#B3D944] text-[#17191A] font-semibold rounded-lg text-sm transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-[#17191A]/25 border-t-[#17191A] animate-spin" aria-hidden="true" />
                    Creating batch…
                  </>
                ) : (
                  <>
                    <Check size={16} strokeWidth={2.5} /> Create batch
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })()}

      {created && (
        <BatchCreatedModal
          batch={created.batch}
          vaccinations={created.vaccinations}
          failedVaccinations={created.failedVaccinations}
          onOpenBatch={() => navigate(`/batches/${created.batch.batchId}`)}
          onDashboard={() => navigate('/dashboard')}
        />
      )}

    </div>
  );
}

export default CreateBatchPage;
