import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Info, ShieldCheck, Syringe, Plus, Trash2, Bell } from 'lucide-react';
import { BirdIcon } from '../components/ui/BirdIcon';
import { useBatches } from '../context/BatchContext';
import { useAuth } from '../context/AuthContext';
import { createSchedule } from '../api/schedule';
import { useToast } from '../components/ui/Toast';
import { BIRD_PURPOSES, allBirdTypes, birdPurpose, birdTypeLabel, laysEggs } from '../lib/batch';
import { DOSE_NUMBERS, ROUTES, findVaccine, vaccinesFor } from '../lib/vaccines';
import { pensInUse } from '../lib/pens';
import { toIso } from '../lib/supplements';

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

export function CreateBatchPage() {
  const navigate = useNavigate();
  const { batches, createBatch } = useBatches();
  const { farm } = useAuth();
  const toast = useToast();
  const today = toIso(new Date());

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [birdType, setBirdType] = useState('layer'); // built-in or the farm's own type id
  const [birdCount, setBirdCount] = useState('');
  const [breed, setBreed] = useState('');
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
      if (!birdCount || Number(birdCount) <= 0) return toast('Please enter a valid bird count', 'error');
      if (!startDate) return toast('Please select date placed', 'error');
    }
    if (currentStep === 3) {
      const half = vaccinations.find((r) => (r.vaccineName || r.customName) && !r.dueDate);
      if (half) return toast('Pick a date for each vaccination, or remove the row', 'error');
      const missingName = vaccinations.find((r) => r.vaccineName === OTHER_VACCINE && !r.customName.trim());
      if (missingName) return toast('Enter the name of the other vaccine', 'error');
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
        breed: breed.trim() || undefined,
        // housing keeps the pen's name too, so older screens still show it.
        housing: selectedPen?.name || housing.trim() || undefined,
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
              ...(r.doseNumber ? { doseNumber: r.doseNumber } : {}),
              ...(vaccine?.route ? { route: vaccine.route } : {}),
            });
          })
        );
        failed = results.filter((x) => x.status === 'rejected').length;
      }

      toast(
        failed
          ? `Batch created, but ${failed} vaccination${failed === 1 ? '' : 's'} could not be scheduled. Add ${failed === 1 ? 'it' : 'them'} from the Vaccination tab.`
          : 'Batch created successfully!',
        failed ? 'error' : 'success'
      );
      navigate(`/batches/${newBatch.batchId}`);
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
          <ArrowLeft size={20} />
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
                      ? 'bg-[#0D5C3A] text-white shadow-xs'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 text-stone-400 border border-stone-200'
                  }`}
                >
                  {isDone ? <Check size={14} /> : step.id}
                </div>
                <span
                  className={`font-semibold truncate hidden sm:inline ${
                    isCurrent ? 'text-[#0D5C3A]' : isDone ? 'text-stone-700' : 'text-stone-400'
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
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400"
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
                  onChange={e => setBirdType(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all cursor-pointer"
                >
                  {allBirdTypes().map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <Link to="/settings/farm" className="inline-block text-[11px] font-semibold text-[#0D5C3A] hover:underline">
                  Keep a bird that isn't listed? Add it in Farm Details
                </Link>

                <div className="flex items-center gap-2 pt-1 text-xs">
                  {laysEggs(birdType) ? (
                    <span className="text-[#0D5C3A] font-semibold flex items-center gap-1">
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
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400"
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
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400"
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

            {/* Breed & Date Placed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Breed (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hisex Brown"
                  value={breed}
                  onChange={e => setBreed(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Date Placed / Acquired <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all"
                />
              </div>
            </div>

            {/* Pen — picked from the farm's pens; free text only until pens are set up */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Pen / House (optional)
              </label>
              {pens.length > 0 ? (
                <select
                  value={penId}
                  onChange={e => setPenId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all cursor-pointer"
                >
                  <option value="">No pen</option>
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
                    className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400"
                  />
                  <Link to="/settings/farm" className="inline-block text-[11px] font-semibold text-[#0D5C3A] hover:underline">
                    Set up your pens in Farm Details to pick from a list
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={nextStep}
              className="px-8 py-3 bg-[#0D5C3A] hover:bg-[#094229] text-white font-bold rounded-xl text-sm transition-all duration-150 inline-flex items-center gap-2 cursor-pointer shadow-xs"
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
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Source Hatchery / Supplier (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. CHI Farms, Zartech, Amo Hatchery"
                value={hatchery}
                onChange={e => setHatchery(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400"
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
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400"
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
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400"
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
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold rounded-xl text-sm transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-8 py-3 bg-[#0D5C3A] hover:bg-[#094229] text-white font-bold rounded-xl text-sm transition-all duration-150 inline-flex items-center gap-2 cursor-pointer shadow-xs"
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

          <div className="bg-[#EAF5EF] border border-[#CFE8D9] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-white text-[#0D5C3A] flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#0D472B]">Keep your birds healthy</h4>
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
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] cursor-pointer"
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
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] placeholder:text-stone-400"
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
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A]"
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-[11px] font-bold text-stone-700 block">Dose</label>
                      <select
                        value={row.doseNumber}
                        onChange={e => updateVaccination(row.key, 'doseNumber', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] cursor-pointer"
                      >
                        <option value="">Not set</option>
                        {DOSE_NUMBERS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  {vaccine && !isOther && (
                    <p className="text-[11px] text-stone-500 flex items-start gap-1.5">
                      <Info size={12} className="shrink-0 mt-0.5 text-[#0D5C3A]" />
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
              className="w-full py-3 rounded-2xl border border-dashed border-[#0D5C3A]/40 text-sm font-semibold text-[#0D5C3A] hover:bg-[#EAF5EF] transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
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
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-8 py-3 bg-[#0D5C3A] hover:bg-[#094229] text-white font-bold rounded-xl text-sm transition-all duration-150 inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Confirm */}
      {currentStep === 4 && (
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-stone-950 font-heading">4. Review</h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Review your batch details before creating it.
            </p>
          </div>

          <div className="border border-stone-200 rounded-2xl p-5 space-y-4 bg-stone-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block font-medium">Batch Name</span>
                <span className="text-stone-900 font-bold text-sm">{name}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Bird Type</span>
                <span className="text-stone-900 font-bold text-sm uppercase">{birdTypeLabel(birdType)}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Flock Size</span>
                <span className="text-stone-900 font-bold text-sm">{Number(birdCount).toLocaleString()} birds</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Breed</span>
                <span className="text-stone-900 font-semibold">{breed || 'Standard'}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Placement Date</span>
                <span className="text-stone-900 font-semibold">{startDate}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Initial Age</span>
                <span className="text-stone-900 font-semibold">{ageValue} {ageUnit}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Pen</span>
                <span className="text-stone-900 font-semibold">{selectedPen?.name || housing.trim() || 'Not set'}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Cost of Birds</span>
                <span className="text-stone-900 font-semibold">
                  {Number(purchaseCost) > 0 ? `₦${Number(purchaseCost).toLocaleString()}` : 'Not set'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 text-xs space-y-2">
              <span className="text-stone-400 block font-medium">
                Vaccination Schedule ({plannedVaccinations.length})
              </span>
              {plannedVaccinations.length === 0 ? (
                <p className="text-stone-500">None planned.</p>
              ) : (
                plannedVaccinations.map((r) => (
                  <div key={r.key} className="flex items-center justify-between gap-3 font-semibold text-stone-900 bg-white p-2.5 rounded-xl border border-stone-200">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <Syringe size={13} strokeWidth={2.5} className="text-stone-500 shrink-0" />
                      <span className="truncate">{vaccineNameOf(r)}{r.doseNumber ? ` · ${r.doseNumber}` : ''}</span>
                    </span>
                    <span className="shrink-0 text-stone-600">{r.dueDate}</span>
                  </div>
                ))
              )}
              {plannedVaccinations.length > 0 && (
                <p className="text-[11px] text-stone-500 inline-flex items-center gap-1.5">
                  <Bell size={12} /> Reminder email 3 days before each one and on the day.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold rounded-xl text-sm transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="px-9 py-3 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white font-bold rounded-xl text-sm transition-all duration-150 inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? 'Creating Batch…' : 'Create Batch'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default CreateBatchPage;
