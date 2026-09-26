import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage({ onBack }) {
  const navigate = useNavigate();
  const { otpSession, authLoading, authError, sendCode, verifyCode, setAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setAuthError('Enter your email address');
    await sendCode(email.trim());
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!code.trim()) return setAuthError('Enter the 6-digit code from your email');
    await verifyCode(code.trim());
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
                farm<span className="text-emerald-500">book</span>
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
                <span>Passwordless Login</span>
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
            <span className="transition-transform group-hover:-translate-x-0.5">←</span>
            <span>Back to homepage</span>
          </button>

          <div className="lg:hidden">
            <a href="/" className="flex items-center gap-1">
              <span className="text-[20px] font-bold tracking-tight text-neutral-900">
                farm<span className="text-emerald-600">book</span>
              </span>
            </a>
          </div>
        </div>

        {/* Center Auth Container */}
        <div className="w-full max-w-md mx-auto my-auto py-10 sm:py-14">
          {!otpSession ? (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Welcome back
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mt-1">
                  Sign in to your farm
                </h1>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                  Enter your email address and we'll send you a passwordless one-time verification code.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleRequestOtp}>
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

                <button
                  type="submit"
                  className="w-full py-3.5 px-5 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white font-semibold rounded-full shadow-sm text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <>
                      <div className="spinner !w-4 !h-4 !border-white/40 !border-t-white" />
                      <span>Sending verification code…</span>
                    </>
                  ) : (
                    <>
                      <span>Send verification code</span>
                      <span className="text-base leading-none">→</span>
                    </>
                  )}
                </button>
              </form>

            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Verification
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mt-1">
                  Check your inbox
                </h1>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                  We sent a 6-digit one-time code to{' '}
                  <span className="font-semibold text-neutral-900">{email}</span>
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleVerifyOtp}>
                {authError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{authError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-800 block" htmlFor="login-code">
                    6-digit verification code
                  </label>
                  <input
                    id="login-code"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-lg font-mono tracking-[0.25em] text-center font-bold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter code"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    autoFocus
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
                      <span>Verifying code…</span>
                    </>
                  ) : (
                    <span>Verify &amp; Sign in</span>
                  )}
                </button>

                <div className="pt-2 flex items-center justify-between text-xs text-neutral-500">
                  <button
                    type="button"
                    onClick={() => sendCode(email)}
                    className="font-medium text-neutral-800 hover:text-neutral-950 hover:underline cursor-pointer"
                    disabled={authLoading}
                  >
                    Didn't get code? Resend
                  </button>

                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-neutral-500 hover:text-neutral-800 hover:underline cursor-pointer"
                  >
                    Change email
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer Security Note */}
        <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400">
         
          <div>© {new Date().getFullYear()} FarmBook</div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
