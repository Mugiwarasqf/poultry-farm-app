import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidEmailFormat, passwordError, suggestEmailCorrection } from '../lib/authValidation';
import { SUPPORT_WHATSAPP_URL } from '../lib/support';

export function SignupPage({ onBack }) {
  const navigate = useNavigate();
  const { authLoading, authError, signup, setAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dismissedSuggestion, setDismissedSuggestion] = useState('');

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  // Non-blocking nudge, not a gate -- plenty of real addresses use a
  // domain outside the short common list this checks against. Cleared the
  // moment the farmer accepts it or types something else, so it never
  // reappears for an address they've already looked at once.
  const suggestion = useMemo(() => {
    const s = suggestEmailCorrection(email);
    return s && s !== dismissedSuggestion ? s : null;
  }, [email, dismissedSuggestion]);

  const pwError = password ? passwordError(password) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !isValidEmailFormat(email)) {
      return setAuthError('Enter a valid email address');
    }
    if (email.trim() !== confirmEmail.trim()) {
      return setAuthError('Emails do not match');
    }
    const pErr = passwordError(password);
    if (pErr) return setAuthError(pErr);
    if (password !== confirmPassword) {
      return setAuthError('Passwords do not match');
    }
    const ok = await signup(email.trim(), password);
    if (ok) navigate('/onboarding');
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row selection:bg-neutral-900 selection:text-white">
      {/* Left Column: Visual Brand Card (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[52%] p-4 lg:p-6 flex-col">
        <div className="relative w-full h-full min-h-[calc(100vh-3rem)] rounded-3xl overflow-hidden bg-neutral-950 flex flex-col justify-between p-10 xl:p-12 text-white shadow-2xl border border-neutral-800">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-85 transition-transform duration-1000 ease-out hover:scale-105"
            style={{ backgroundImage: "url('/images/irvan-maulana-ENQIxReDFKE-unsplash.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-neutral-950/40 to-neutral-950/30" />

          <div className="relative z-10">
            <a href="/" className="inline-flex items-center gap-1.5 focus:outline-hidden">
              <span className="text-[24px] font-bold tracking-tight text-white">
                Track<span className="text-emerald-500">Farm</span>
              </span>
            </a>
          </div>

          <div className="relative z-10 space-y-5 max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-white/15">
              <span>🇳🇬</span>
              <span>Modern Poultry Tracking for Nigeria</span>
            </div>
            <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-snug">
              Set up your farm in under a minute.
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              One account, every batch tracked: mortality, feed, eggs, vaccinations, and profit.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="flex-1 flex flex-col justify-between px-6 py-6 sm:px-12 lg:px-14 xl:px-20 bg-white">
        <div className="flex items-center justify-between w-full">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-950 transition-colors cursor-pointer group"
          >
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back to homepage</span>
          </button>
          <div className="lg:hidden">
            <a href="/" className="flex items-center gap-1">
              <span className="text-[20px] font-bold tracking-tight text-neutral-900">
                Track<span className="text-emerald-600">Farm</span>
              </span>
            </a>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto my-auto py-10 sm:py-14">
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Get started
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mt-1">
                Create your account
              </h1>
              <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                You'll be taken straight into setting up your farm.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {authError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-800 block" htmlFor="signup-email">
                  Email address
                </label>
                <input
                  id="signup-email"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                  type="email"
                  placeholder="farmer@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  disabled={authLoading}
                />
                {suggestion && (
                  <p className="text-xs text-amber-700">
                    Did you mean{' '}
                    <button
                      type="button"
                      className="font-semibold underline underline-offset-2 cursor-pointer"
                      onClick={() => { setEmail(suggestion); setDismissedSuggestion(suggestion); }}
                    >
                      {suggestion}
                    </button>
                    ?
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-800 block" htmlFor="signup-confirm-email">
                  Confirm email address
                </label>
                <input
                  id="signup-confirm-email"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                  type="email"
                  placeholder="Type it again"
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                  disabled={authLoading}
                />
                {confirmEmail && confirmEmail.trim() !== email.trim() && (
                  <p className="text-xs text-amber-700">Emails don't match yet</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-800 block" htmlFor="signup-password">
                  Password
                </label>
                <input
                  id="signup-password"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={authLoading}
                />
                <p className={`text-xs ${pwError ? 'text-amber-700' : 'text-neutral-400'}`}>
                  {pwError || 'At least 8 characters, with a letter and a number'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-800 block" htmlFor="signup-confirm-password">
                  Confirm password
                </label>
                <input
                  id="signup-confirm-password"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                  type="password"
                  placeholder="Type it again"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={authLoading}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-amber-700">Passwords don't match yet</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white font-semibold rounded-full shadow-sm text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={authLoading}
              >
                {authLoading ? (
                  <>
                    <div className="spinner !w-4 !h-4 !border-white/40 !border-t-white" />
                    <span>Creating your account…</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <span className="text-base leading-none">→</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-neutral-500">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-neutral-800 hover:text-neutral-950 hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400">
          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-700 hover:underline">
            Need help? Message us on WhatsApp
          </a>
          <div>© {new Date().getFullYear()} TrackFarm</div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
