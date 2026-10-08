import { Link } from 'react-router-dom';
import { MailWarning } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Shown when the email on file has permanently bounced or complained
 * (Farm.emailBounced, set by backend/src/handlers/sesEvents/index.ts).
 * Without this, a mistyped address at signup is a silent dead end --
 * notifications never arrive and a forgotten password can't be reset --
 * with nothing in the app ever telling the farmer why.
 */
export function EmailBounceBanner() {
  const { emailBounced } = useAuth();
  if (!emailBounced) return null;

  return (
    <div
      role="status"
      className="bg-rose-50 border-b border-rose-200 text-rose-900 px-4 sm:px-8 py-2 text-xs sm:text-sm flex items-start gap-2"
    >
      <MailWarning size={15} strokeWidth={2.5} className="shrink-0 mt-0.5" />
      <span className="min-w-0">
        We couldn't deliver to the email on your account. You won't get reminders, and you won't be able to reset
        your password until this is fixed.{' '}
        <Link to="/settings" className="font-semibold underline underline-offset-2">
          Update your email
        </Link>
      </span>
    </div>
  );
}

export default EmailBounceBanner;
