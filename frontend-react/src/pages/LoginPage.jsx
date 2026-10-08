import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidEmailFormat } from '../lib/authValidation';
import { SUPPORT_WHATSAPP_URL } from '../lib/support';

export function LoginPage({ onBack }) {
  const navigate = useNavigate();
  const { authLoading, authError, login, setAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !isValidEmailFormat(email)) {
      return setAuthError('Enter a valid email address');
    }
    if (!password) {
      return setAuthError('Enter your password');
    }
    const ok = await login(email.trim(), password);
    if (ok) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row selection:bg-neutral-900 selection:text-white">
      {/* Left Column: Visual Brand Card (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[52%] p-4 lg:p-6 flex-col">
        <div className="relative w-full h-full min-h-[calc(100vh-3rem)] rounded-3xl overflow-hidden bg-neutral-950 flex flex-col justify-between p-10 xl:p-12 text-white shadow-2xl border border-neutral-800">
          {/* Background image & gradient overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-85 transition-transform duration-1000 ease-out hover:scale-105"
            style={{
              backgroundImage: "url('/images/irvan-maulana-ENQIxReDFKE-unsplash.jpg')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-neutral-950/40 to-neutral-950/30" />

          {/* Top Logo Badge */}
          <div className="relative z-10">
            <a href="/" className="inline-flex items-center gap-1.5 focus:outline-hidden">
              <span className="text-[24px] font-bold tracking-tight text-white">
                Track<span className="text-emerald-500">Farm</span>
              </span>
            </a>
          </div>

          {/* Bottom Highlights */}
          <div className="relative z-10 space-y-5 max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-white/15">
              <span>🇳🇬</span>
              <span>Modern Poultry Tracking for Nigeria</span>
            </div>

            <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-snug">
              Every bird counted. Every naira tracked.
            </h2>

            <p className="text-sm text-neutral-300 leading-relaxed">
              Replace messy paper logbooks with automated daily mortality logs, feed FCR calculations, vaccination alerts, and net profit analytics.
            </p>

            <div className="pt-2 flex items-center gap-6 text-xs text-neutral-300 border-t border-white/15">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Works Offline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Offline Capable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Real-Time Profit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Form */}
      <div className="flex-1 flex flex-col justify-between px-6 py-6 sm:px-12 lg:px-14 xl:px-20 bg-white">
        {/* Top bar with back navigation & mobile logo */}
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

        {/* Center Auth Container */}
        <div className="w-full max-w-md mx-auto my-auto py-10 sm:py-14">
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Welcome back
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mt-1">
                Sign in to your farm
              </h1>
              <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                Enter your email and password to continue.
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
                <label className="text-xs font-semibold text-neutral-800 block" htmlFor="login-email">
                  Email address
                </label>
                <input
                  id="login-email"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                  type="email"
                  placeholder="farmer@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  disabled={authLoading}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-800 block" htmlFor="login-password">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="login-password"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={authLoading}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white font-semibold rounded-full shadow-sm text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={authLoading}
              >
                {authLoading ? (
                  <>
                    <div className="spinner !w-4 !h-4 !border-white/40 !border-t-white" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <span className="text-base leading-none">→</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-neutral-500">
                New here?{' '}
                <Link to="/signup" className="font-medium text-neutral-800 hover:text-neutral-950 hover:underline">
                  Create an account
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Footer: security note + a non-email recovery path for an
            audience where a lost password and a lost email can mean the
            same dead end. See docs/CLAUDE.md's working preferences --
            WhatsApp is the channel this audience is already proven
            comfortable with. */}
        <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400">
          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-700 hover:underline">
            Trouble signing in? Message us on WhatsApp
          </a>
          <div>© {new Date().getFullYear()} TrackFarm</div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
