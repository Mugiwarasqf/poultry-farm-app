import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidEmailFormat, passwordError } from '../lib/authValidation';
import { SUPPORT_WHATSAPP_URL } from '../lib/support';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { authLoading, authError, sendPasswordReset, resetPassword, setAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [done, setDone] = useState(false);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!email.trim() || !isValidEmailFormat(email)) {
      return setAuthError('Enter a valid email address');
    }
    const ok = await sendPasswordReset(email.trim());
    if (ok) setCodeSent(true);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!code.trim()) return setAuthError('Enter the code from your email');
    const pErr = passwordError(newPassword);
    if (pErr) return setAuthError(pErr);
    const ok = await resetPassword(email.trim(), code.trim(), newPassword);
    if (ok) setDone(true);
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col selection:bg-neutral-900 selection:text-white">
      <div className="flex items-center w-full px-6 py-6 sm:px-12">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-950 transition-colors cursor-pointer group"
        >
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          <span>Back to sign in</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md space-y-6">
          {done ? (
            <div className="space-y-5 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
                Password updated
              </h1>
              <p className="text-sm text-neutral-600 leading-relaxed">
                You can sign in with your new password now.
              </p>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center gap-2 py-3.5 px-5 bg-[#0D5C3A] hover:bg-[#094229] text-white font-semibold rounded-full shadow-sm text-sm transition-all"
              >
                Go to sign in
              </Link>
            </div>
          ) : !codeSent ? (
            <>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Reset password
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mt-1">
                  Forgot your password?
                </h1>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                  Enter your email and we'll send a reset code.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleRequest}>
                {authError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{authError}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-800 block" htmlFor="forgot-email">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
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
                  {authLoading ? 'Sending…' : 'Send reset code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Check your inbox
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mt-1">
                  Enter the reset code
                </h1>
                <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
                  We sent a code to <span className="font-semibold text-neutral-900">{email}</span>, if an account exists for it.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleConfirm}>
                {authError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{authError}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-800 block" htmlFor="forgot-code">
                    Reset code
                  </label>
                  <input
                    id="forgot-code"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-lg font-mono tracking-[0.2em] text-center font-bold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter code"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    autoFocus
                    disabled={authLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-800 block" htmlFor="forgot-new-password">
                    New password
                  </label>
                  <input
                    id="forgot-new-password"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-[#0D5C3A]/15 focus:border-[#0D5C3A] transition-all placeholder:text-neutral-400"
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={authLoading}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 px-5 bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white font-semibold rounded-full shadow-sm text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={authLoading}
                >
                  {authLoading ? 'Updating…' : 'Update password'}
                </button>
                <button
                  type="button"
                  onClick={() => sendPasswordReset(email)}
                  className="w-full text-center text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:underline cursor-pointer"
                  disabled={authLoading}
                >
                  Didn't get a code? Resend
                </button>
              </form>
            </>
          )}

          <div className="pt-6 border-t border-neutral-100 text-center text-xs text-neutral-400">
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-700 hover:underline">
              Still stuck? Message us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
