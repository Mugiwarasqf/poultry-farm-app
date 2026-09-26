import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Calendar, AlertCircle, Info, ShieldCheck, HelpCircle, Syringe } from 'lucide-react';
import { BirdIcon } from '../components/ui/BirdIcon';
import { useBatches } from '../context/BatchContext';
import { createSchedule } from '../api/schedule';
import { useToast } from '../components/ui/Toast';
import { BIRD_TYPES, birdTypeLabel, laysEggs } from '../lib/batch';

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Birds & Housing' },
  { id: 3, label: 'Vaccination' },
  { id: 4, label: 'Review' },
];

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

export function CreateBatchPage() {
  const navigate = useNavigate();
  const { createBatch } = useBatches();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [birdType, setBirdType] = useState('layer'); // one of BIRD_TYPES
  const [birdCount, setBirdCount] = useState('');
  const [breed, setBreed] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [housing, setHousing] = useState('');
  const [ageValue, setAgeValue] = useState('1');
  const [ageUnit, setAgeUnit] = useState('weeks'); // 'days' | 'weeks'

  // Step 2: Birds & Housing
  const [hatchery, setHatchery] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [notes, setNotes] = useState('');

  // Step 3: Vaccination
  const [addVaccine, setAddVaccine] = useState(true);
  const [vaccineName, setVaccineName] = useState('Newcastle (ND)');
  const [vaccineDate, setVaccineDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [enableReminder, setEnableReminder] = useState(true);
  const [reminderTiming, setReminderTiming] = useState('3 days before');
  const [vaccineNotes, setVaccineNotes] = useState('');

  const nextStep = () => {
    if (currentStep === 1) {
      if (!name.trim()) return toast('Please enter a batch name', 'error');
      if (!birdCount || Number(birdCount) <= 0) return toast('Please enter a valid bird count', 'error');
      if (!startDate) return toast('Please select date placed', 'error');
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
        housing: housing.trim() || undefined,
        initialAgeWeeks: calculatedAgeWeeks || 0,
        notes: notes.trim() || undefined,
      });

      // 2. If vaccination schedule was configured, save it
      if (addVaccine && vaccineName && vaccineDate && newBatch.batchId) {
        try {
          await createSchedule(newBatch.batchId, {
            vaccineName,
            dueDate: vaccineDate,
          });
        } catch (vacErr) {
          console.warn('Initial vaccination schedule skipped:', vacErr);
        }
      }

      toast('Batch created successfully!', 'success');
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
                  {BIRD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>

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
                  <h4 className="text-xs font-bold text-stone-950">Only Layers produce eggs</h4>
                  <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                    Egg production is only available for Layer batches. Other bird types are tracked for feed, health and bird losses.
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

            {/* Location / Housing */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Location / House (optional)
              </label>
              <input
                type="text"
                placeholder="Select location or enter pen / house"
                value={housing}
                onChange={e => setHousing(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all placeholder:text-stone-400"
              />
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

            {birdType === 'broiler' && (
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

      {/* Step 3: Vaccination (Matching Reference Screenshot Exactly) */}
      {currentStep === 3 && (
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-stone-950 font-heading">Vaccination</h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Add vaccination schedule and set reminders for this batch.
            </p>
          </div>

          {/* Green banner matching reference image */}
          <div className="bg-[#EAF5EF] border border-[#CFE8D9] rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-white text-[#0D5C3A] flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#0D472B]">Keep your birds healthy</h4>
              <p className="text-xs text-stone-600 mt-0.5">
                Set vaccination dates and reminders so you never miss an important dose.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Vaccination Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={vaccineName}
                  onChange={e => setVaccineName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all cursor-pointer"
                >
                  {VACCINE_OPTIONS.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Vaccination Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={vaccineDate}
                  onChange={e => setVaccineDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/20 focus:border-[#0D5C3A] transition-all"
                />
              </div>
            </div>

            {/* Set Reminder row matching reference image */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-stone-800">Set Reminder</div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-3 flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableReminder}
                      onChange={e => setEnableReminder(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D5C3A]"></div>
                  </label>
                  <span className="text-xs text-stone-600 font-medium">
                    {enableReminder ? 'On' : 'Off'}
                  </span>
                </div>

                <div className="sm:col-span-5">
                  <input
                    type="date"
                    disabled={!enableReminder}
                    value={vaccineDate}
                    onChange={e => setVaccineDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800 disabled:opacity-50"
                  />
                </div>

                <div className="sm:col-span-4">
                  <select
                    disabled={!enableReminder}
                    value={reminderTiming}
                    onChange={e => setReminderTiming(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-hidden cursor-pointer disabled:opacity-50"
                  >
                    <option value="3 days before">3 days before</option>
                    <option value="1 day before">1 day before</option>
                    <option value="Day of">Day of vaccination</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Batch specific notes or additional instructions..."
                value={vaccineNotes}
                onChange={e => setVaccineNotes(e.target.value)}
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
            </div>

            {addVaccine && (
              <div className="pt-3 border-t border-stone-200 text-xs">
                <span className="text-stone-400 block font-medium mb-1">Vaccination Schedule</span>
                <div className="flex items-center justify-between font-semibold text-stone-900 bg-white p-2.5 rounded-xl border border-stone-200">
                  <span className="inline-flex items-center gap-1.5"><Syringe size={13} strokeWidth={2.5} className="text-stone-500" />{vaccineName}</span>
                  <span>Date: {vaccineDate} ({reminderTiming})</span>
                </div>
              </div>
            )}
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
