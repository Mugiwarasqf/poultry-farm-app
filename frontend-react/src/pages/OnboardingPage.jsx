import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Pencil, Calendar, ArrowLeft, ArrowRight, Check, Drumstick, Egg, Bird } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBatches } from '../context/BatchContext';
import { updateFarm } from '../api/farms';
import { useToast } from '../components/ui/Toast';

const STEPS = ['farm-name', 'bird-type', 'location', 'first-batch'];

const ONBOARDING_IMAGES = [
  {
    src: '/onboarding/public-domain-vectors-uiNO69dv9hA-unsplash.jpg',
    fallbackSrc: '/onboarding/m-umar-farooq-m5kyRt_MHCM-unsplash.jpg',
    title: 'Modern Poultry Record Keeping',
    tagline: 'Replace paper notebooks with effortless digital tracking.',
  },
  {
    src: '/onboarding/m-umar-farooq-m5kyRt_MHCM-unsplash.jpg',
    fallbackSrc: '/onboarding/public-domain-vectors-uiNO69dv9hA-unsplash.jpg',
    title: 'Flock & Breed Management',
    tagline: 'Broilers, layers, or cockerels — tailored logging defaults.',
  },
  {
    src: '/onboarding/sila-bayraktar-DhSvkfxGPRM-unsplash.jpg',
    fallbackSrc: '/onboarding/hanin-abouzeid-eUeri0TZRuQ-unsplash.jpg',
    title: 'Nigerian Farm Locations',
    tagline: 'Built specifically for poultry farmers across Nigeria.',
  },
  {
    src: '/onboarding/m-umar-farooq-zXxClUJlBvc-unsplash.jpg',
    fallbackSrc: '/onboarding/hanin-abouzeid-eUeri0TZRuQ-unsplash.jpg',
    title: 'Launch Your First Batch',
    tagline: 'Every bird counted, every naira tracked from day-old to harvest.',
  },
];

export function OnboardingPage({ onComplete }) {
  const navigate = useNavigate();
  const { farmId, updateFarmProfile } = useAuth();
  const { createBatch } = useBatches();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state across steps
  const [farmName, setFarmName] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [birdType, setBirdType] = useState('broiler');
  const [birdCount, setBirdCount] = useState('');
  const [location, setLocation] = useState('');
  const [batchName, setBatchName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handleSaveFarmName = async (e) => {
    if (e) e.preventDefault();
    if (!farmName.trim()) return;
    setLoading(true);
    try {
      localStorage.setItem('farmbook_farmname', farmName.trim());
      if (farmerName.trim()) {
        localStorage.setItem('farmbook_farmername', farmerName.trim());
      }
      if (updateFarmProfile) {
        updateFarmProfile({ name: farmName.trim(), farmerName: farmerName.trim() });
      }
      await updateFarm(farmId, { name: farmName.trim(), farmerName: farmerName.trim() });
    } catch (err) {
      console.warn('Farm name update route not yet deployed on backend; saved locally.', err);
    } finally {
      setLoading(false);
      next();
    }
  };

  const handleSaveLocation = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      if (location.trim()) {
        localStorage.setItem('farmbook_farmlocation', location.trim());
        if (updateFarmProfile) {
          updateFarmProfile({ location: location.trim() });
        }
        await updateFarm(farmId, { location: location.trim() });
      }
    } catch (err) {
      console.warn('Farm location update route not yet deployed on backend; saved locally.', err);
    } finally {
      setLoading(false);
      next();
    }
  };

  const handleCreateBatch = async (e) => {
    if (e) e.preventDefault();
    const name = batchName.trim() || `${birdType === 'layer' ? 'Layer' : 'Broiler'} Batch 1`;
    const count = parseInt(birdCount) || 100;
    setLoading(true);
    try {
      // 1. Create first batch
      await createBatch({
        name,
        type: birdType,
        startDate,
        birdCount: count,
      });

      // 2. Persist full onboarding profile to database & state
      const profileUpdates = {
        name: farmName.trim() || 'My Farm',
        farmerName: farmerName.trim(),
        location: location.trim(),
        birdType,
        onboarded: true,
      };

      try {
        await updateFarm(farmId, profileUpdates);
      } catch (saveErr) {
        console.warn('Backend updateFarm pending deploy; profile preserved locally.', saveErr);
      }

      if (updateFarmProfile) {
        updateFarmProfile(profileUpdates);
      }

      toast('Your farm is ready!', 'success');
      if (onComplete) onComplete();
      navigate('/dashboard');
    } catch (err) {
      toast(err.message || 'Failed to create batch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentImage = ONBOARDING_IMAGES[step] || ONBOARDING_IMAGES[0];

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-neutral-900 selection:text-white font-sans text-neutral-900">
      {/* Top Navigation Bar: Clean White with Logo & Profile Icon (No progress bar) */}
      <header className="w-full bg-white border-b border-neutral-200/80 px-6 sm:px-12 py-4 flex items-center justify-between z-10">
        <a href="/" className="flex items-center gap-1 focus:outline-hidden">
          <span className="text-[22px] font-bold tracking-tight text-neutral-950">
            farm<span className="text-emerald-600">book</span>
          </span>
        </a>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-neutral-400 hidden sm:inline-block">
            Step {step + 1} of {STEPS.length}
          </span>
          <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 shadow-2xs">
            <User size={18} />
          </div>
        </div>
      </header>

      {/* Main Body: 2-Column Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row w-full">
        {/* Left Column: Form & Profile Details */}
        <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-20 max-w-2xl mx-auto lg:mx-0 w-full">
          <div className="w-full max-w-md mx-auto lg:mx-0 space-y-7">
            {/* Step 0: Farm Name & Owner Details */}
            {step === 0 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 leading-tight">
                    Howdy, tell us about your farm!
                  </h1>
                  <p className="text-sm text-neutral-500 mt-2">
                    Let's personalize your farm records and daily logbook.
                  </p>
                </div>

                {/* Avatar with Edit Badge (matches reference image) */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-neutral-800 text-white flex items-center justify-center shadow-md">
                      <span className="text-2xl font-bold uppercase tracking-wider">
                        {farmName ? farmName.charAt(0) : '🚜'}
                      </span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-7 h-7 bg-neutral-900 border-2 border-white rounded-full flex items-center justify-center text-white shadow-xs">
                      <Pencil size={13} />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                      Farm Identity
                    </span>
                    <span className="text-sm text-neutral-600">
                      {farmName ? farmName : 'Set your farm details'}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSaveFarmName} className="space-y-5 pt-2">
                  {/* Floating-style Input: Farm Name */}
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                      Farm name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                      placeholder="e.g. Adeola Poultry Farm"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  {/* Floating-style Input: Farmer/Manager Name */}
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                      Farmer or Manager name (Optional)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                      placeholder="e.g. Babatunde"
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                    />
                  </div>

                  {/* Action Button: NEXT (styled like screenshot) */}
                  <div className="pt-3 flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={!farmName.trim() || loading}
                      className="px-9 py-3.5 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white text-xs font-bold tracking-wider uppercase rounded-full shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {loading ? 'SAVING…' : 'NEXT'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 1: Bird Type / Breed Selection */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 leading-tight">
                    What birds do you raise?
                  </h1>
                  <p className="text-sm text-neutral-500 mt-2">
                    Select your flock category to set up automatic logging metrics.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[
                    { value: 'broiler', label: 'Broilers', icon: Drumstick, desc: 'Meat production' },
                    { value: 'layer', label: 'Layers', icon: Egg, desc: 'Egg production' },
                    { value: 'other', label: 'Other', icon: Bird, desc: 'Turkey, duck, cockerel…' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBirdType(opt.value)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        birdType === opt.value
                          ? 'bg-[#0D5C3A] text-white border-[#0D5C3A] shadow-md ring-2 ring-[#0D5C3A]/20'
                          : 'bg-white border-neutral-200 text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <opt.icon size={24} strokeWidth={2} className="mb-1.5" />
                      <span className="text-xs font-bold">{opt.label}</span>
                      <span className={`text-[10px] mt-1 text-center ${birdType === opt.value ? 'text-emerald-100' : 'text-neutral-400'}`}>
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative pt-2">
                  <label className="absolute top -top-0.5 left-3.5 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                    Estimated Flock Count
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                    placeholder="e.g. 500"
                    value={birdCount}
                    onChange={(e) => setBirdCount(e.target.value)}
                  />
                </div>

                <div className="pt-3 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={next}
                    className="px-9 py-3.5 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white text-xs font-bold tracking-wider uppercase rounded-full shadow-sm transition-all duration-150 cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    NEXT
                  </button>
                  <button
                    type="button"
                    onClick={prev}
                    className="px-5 py-3.5 text-neutral-600 hover:text-neutral-950 text-xs font-bold tracking-wider uppercase cursor-pointer"
                  >
                    BACK
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 leading-tight">
                    Where is your farm located?
                  </h1>
                  <p className="text-sm text-neutral-500 mt-2">
                    Enter your State or Local Government Area in Nigeria.
                  </p>
                </div>

                <form onSubmit={handleSaveLocation} className="space-y-5 pt-1">
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                      State / City / LGA
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                      placeholder="e.g. Oyo State, Nigeria"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="pt-3 flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-9 py-3.5 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white text-xs font-bold tracking-wider uppercase rounded-full shadow-sm transition-all duration-150 cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? 'SAVING…' : 'NEXT'}
                    </button>
                    <button
                      type="button"
                      onClick={prev}
                      className="px-5 py-3.5 text-neutral-600 hover:text-neutral-950 text-xs font-bold tracking-wider uppercase cursor-pointer"
                    >
                      BACK
                    </button>
                    <button
                      type="button"
                      onClick={() => next()}
                      className="text-xs font-semibold text-neutral-400 hover:text-neutral-600 ml-auto cursor-pointer"
                    >
                      Skip for now
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: First Batch Creation */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 leading-tight">
                    Create your first batch
                  </h1>
                  <p className="text-sm text-neutral-500 mt-2">
                    A batch tracks a flock cohort together from day-old to harvest.
                  </p>
                </div>

                <form onSubmit={handleCreateBatch} className="space-y-5 pt-1">
                  {/* Floating Input: Batch Name */}
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                      Batch name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                      placeholder={`e.g. ${birdType === 'layer' ? 'Layer' : 'Broiler'} Batch 1`}
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Floating Input: Start Date */}
                    <div className="relative">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                        Start date
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-3.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>

                    {/* Floating Input: Bird Count */}
                    <div className="relative">
                      <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                        Initial bird count
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                        placeholder="500"
                        value={birdCount}
                        onChange={(e) => setBirdCount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-9 py-3.5 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white text-xs font-bold tracking-wider uppercase rounded-full shadow-sm transition-all duration-150 cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? 'CREATING…' : 'COMPLETE SETUP'}
                    </button>
                    <button
                      type="button"
                      onClick={prev}
                      className="px-5 py-3.5 text-neutral-600 hover:text-neutral-950 text-xs font-bold tracking-wider uppercase cursor-pointer"
                    >
                      BACK
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Illustration & Farm Showcase (styled like reference image) */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#f4f7f4] border-l border-neutral-200/80 p-8 xl:p-12 flex-col justify-between items-center relative overflow-hidden">
          {/* Subtle decorative background circles */}
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full bg-neutral-200/50 blur-3xl pointer-events-none" />

          {/* Top badge */}
          <div className="w-full flex justify-end relative z-10">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-neutral-200/80 text-xs font-semibold text-neutral-700 shadow-2xs backdrop-blur-xs">
              <span>🇳🇬</span>
              <span>Modern Poultry Tracking</span>
            </span>
          </div>

          {/* Center Illustration / Image Card */}
          <div className="relative z-10 my-auto w-full max-w-md flex flex-col items-center">
            <div className="w-full bg-white rounded-3xl p-4 shadow-xl border border-neutral-200/70 transition-all duration-500 ease-out hover:shadow-2xl">
              <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden bg-neutral-100 flex items-center justify-center relative">
                <img
                  src={currentImage.src}
                  alt={currentImage.title}
                  onError={(e) => {
                    if (currentImage.fallbackSrc && e.currentTarget.src !== currentImage.fallbackSrc) {
                      e.currentTarget.src = currentImage.fallbackSrc;
                    }
                  }}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                />
              </div>

              <div className="p-4 sm:p-5 text-center space-y-1.5">
                <h3 className="text-lg font-bold text-neutral-950">
                  {currentImage.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-sm mx-auto">
                  {currentImage.tagline}
                </p>
              </div>
            </div>

            {/* Thumbnail dots to indicate step */}
            <div className="flex items-center gap-2 mt-6">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    step === i ? 'w-8 bg-[#0D5C3A]' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                  }`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Bottom Security / Trust note */}
          <div className="w-full text-center relative z-10 text-xs text-neutral-400">
            © {new Date().getFullYear()} TrackFarm • All rights reserved
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;

