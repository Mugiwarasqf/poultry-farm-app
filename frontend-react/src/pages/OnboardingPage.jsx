import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateFarm } from '../api/farms';
import { useToast } from '../components/ui/Toast';
import { MultiSelect } from '../components/ui/MultiSelect';
import { allBirdTypes } from '../lib/batch';
import { newPenId } from '../lib/pens';

// Onboarding sets up the farm only. The first batch is created afterwards
// from the dashboard, which prompts for it (see DashboardPage).
const STEPS = ['farm-name', 'bird-types', 'farm-info'];
const MAX_PENS = 50;

const FIELD =
  'w-full px-4 py-3.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400';
const NEXT_BTN =
  'px-9 py-3.5 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white text-xs font-bold tracking-wider uppercase rounded-full shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';
const BACK_BTN = 'px-5 py-3.5 text-neutral-600 hover:text-neutral-950 text-xs font-bold tracking-wider uppercase cursor-pointer';

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
    tagline: 'Broilers, layers, noilers or turkeys — tailored logging for each.',
  },
  {
    src: '/onboarding/sila-bayraktar-DhSvkfxGPRM-unsplash.jpg',
    fallbackSrc: '/onboarding/hanin-abouzeid-eUeri0TZRuQ-unsplash.jpg',
    title: 'Nigerian Farm Locations',
    tagline: 'Built specifically for poultry farmers across Nigeria.',
  },
];

export function OnboardingPage({ onComplete }) {
  const navigate = useNavigate();
  const { farmId, updateFarmProfile } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state across steps
  const [farmName, setFarmName] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [birdTypes, setBirdTypes] = useState([]);
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [pens, setPens] = useState([]);

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  /** Saves profile fields to the server and local state; a failed save never blocks onboarding. */
  const saveProfile = async (updates) => {
    if (updateFarmProfile) updateFarmProfile(updates);
    try {
      await updateFarm(farmId, updates);
    } catch (err) {
      console.warn('Farm profile could not be saved to the server yet; kept locally.', err);
    }
  };

  const handleSaveFarmName = async (e) => {
    if (e) e.preventDefault();
    if (!farmName.trim()) return;
    setLoading(true);
    try {
      localStorage.setItem('farmbook_farmname', farmName.trim());
      if (farmerName.trim()) {
        localStorage.setItem('farmbook_farmername', farmerName.trim());
      }
      await saveProfile({ name: farmName.trim(), farmerName: farmerName.trim() });
    } catch (err) {
      console.warn('Farm name could not be saved locally.', err);
    } finally {
      setLoading(false);
      next();
    }
  };

  // Several bird types are stored comma-joined in `birdType` (see
  // parseFarmBirdTypes in lib/batch.js): the farms API keeps it as text.
  const handleSaveBirdTypes = async () => {
    if (birdTypes.length === 0) return toast('Choose at least one bird type', 'error');
    setLoading(true);
    await saveProfile({ birdType: birdTypes.join(',') });
    setLoading(false);
    next();
  };

  // "How many pens?" sets the rows; names default to Pen 1, Pen 2… and can
  // be renamed. Same shape as Settings → Farm Details.
  const setPenCount = (raw) => {
    const target = Math.max(0, Math.min(MAX_PENS, parseInt(raw, 10) || 0));
    setPens((current) =>
      target <= current.length
        ? current.slice(0, target)
        : [
            ...current,
            ...Array.from({ length: target - current.length }, (_, i) => ({ id: newPenId(), name: `Pen ${current.length + i + 1}` })),
          ]
    );
  };
  const renamePen = (id, name) => setPens((list) => list.map((p) => (p.id === id ? { ...p, name } : p)));

  const handleFinish = async (e) => {
    if (e) e.preventDefault();
    // The step dots allow jumping ahead, so check the earlier steps too.
    if (!farmName.trim()) {
      setStep(0);
      return toast('Enter your farm name', 'error');
    }
    if (birdTypes.length === 0) {
      setStep(1);
      return toast('Choose at least one bird type', 'error');
    }
    if (!location.trim()) return toast('Enter where your farm is located', 'error');
    const cleanPens = pens.map((p) => ({ id: p.id, name: p.name.trim() })).filter((p) => p.name);
    if (cleanPens.length !== pens.length) return toast('Give every pen a name', 'error');

    setLoading(true);
    try {
      localStorage.setItem('farmbook_farmlocation', location.trim());
      if (phone.trim()) localStorage.setItem('farmbook_farmphone', phone.trim());
    } catch {
      // Local copies are only a fallback; the server save below is what counts.
    }
    await saveProfile({
      name: farmName.trim() || 'My Farm',
      farmerName: farmerName.trim(),
      birdType: birdTypes.join(','),
      location: location.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(cleanPens.length ? { pens: cleanPens } : {}),
      onboarded: true,
    });
    setLoading(false);
    toast('Your farm is set up!', 'success');
    if (onComplete) onComplete();
    navigate('/dashboard');
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

            {/* Step 2: Bird types (several allowed) */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <div className="flex items-center gap-3 mb-4" aria-hidden="true">
                    <span className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[32px] leading-none">
                      🍗
                    </span>
                    <span className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center">
                      <img src="/icon/chicken-icon.png" alt="" className="w-9 h-9 object-contain" />
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 leading-tight">
                    What birds do you raise?
                  </h1>
                  <p className="text-sm text-neutral-500 mt-2">
                    Pick every type you keep. You can change this later in Settings.
                  </p>
                </div>

                <div className="relative pt-1">
                  <label className="absolute -top-1.5 left-3.5 z-10 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                    Bird types
                  </label>
                  <MultiSelect
                    options={allBirdTypes().map(({ value, label }) => ({ value, label }))}
                    value={birdTypes}
                    onChange={setBirdTypes}
                    placeholder="Select one or more bird types"
                  />
                </div>

                <div className="pt-3 flex items-center gap-4">
                  <button type="button" onClick={handleSaveBirdTypes} disabled={birdTypes.length === 0 || loading} className={NEXT_BTN}>
                    {loading ? 'SAVING…' : 'NEXT'}
                  </button>
                  <button type="button" onClick={prev} className={BACK_BTN}>
                    BACK
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Location and farm info */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-950 leading-tight">
                    Where is your farm?
                  </h1>
                  <p className="text-sm text-neutral-500 mt-2">
                    Your town or LGA in Nigeria, plus a few details about the farm.
                  </p>
                </div>

                <form onSubmit={handleFinish} className="space-y-5 pt-1">
                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                      Town / LGA, State <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={FIELD}
                      placeholder="e.g. Ikorodu, Lagos"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                      Phone number (optional)
                    </label>
                    <input
                      type="tel"
                      className={FIELD}
                      placeholder="e.g. 0803 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <label className="absolute -top-2.5 left-3.5 bg-white px-1.5 text-xs font-semibold text-neutral-700">
                      How many pens or houses? (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={MAX_PENS}
                      className={FIELD}
                      placeholder="e.g. 3"
                      value={pens.length || ''}
                      onChange={(e) => setPenCount(e.target.value)}
                    />
                  </div>

                  {pens.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {pens.map((p, i) => (
                        <input
                          key={p.id}
                          type="text"
                          aria-label={`Pen ${i + 1} name`}
                          className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A]"
                          value={p.name}
                          onChange={(e) => renamePen(p.id, e.target.value)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="pt-3 flex items-center gap-4">
                    <button type="submit" disabled={!location.trim() || loading} className={NEXT_BTN}>
                      {loading ? 'SAVING…' : 'FINISH SETUP'}
                    </button>
                    <button type="button" onClick={prev} className={BACK_BTN}>
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

