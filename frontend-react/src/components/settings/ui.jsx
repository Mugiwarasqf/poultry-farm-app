/**
 * Shared Settings primitives.
 *
 * Every settings panel builds from these so the sub-pages can't drift into
 * one-off styles. Card radius, borders, input chrome and button treatments
 * are defined once here and nowhere else in the settings tree.
 */

/** White rounded card with a bold heading, gray subtitle and optional action. */
export function SettingsCard({ title, description, action, children, className = '' }) {
  return (
    <section className={`bg-white dark:bg-[#17191A] rounded-xl border border-stone-200 dark:border-[#2B3238] shadow-xs p-5 sm:p-6 transition-colors ${className}`}>
      {(title || action) && (
        // Stacked on phones so the action buttons don't squeeze the
        // description into a narrow column; side by side from sm up.
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base sm:text-lg font-bold text-stone-950 dark:text-[#F5F7F5] font-heading">{title}</h2>
            )}
            {description && <p className="text-sm text-stone-500 dark:text-[#94A3B8] mt-0.5 break-words">{description}</p>}
          </div>
          {action && <div className="sm:shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Two-column field grid — collapses to one column on small screens. */
export function FieldGrid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-stone-700 dark:text-[#F5F7F5] mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-400 dark:text-[#64748B] mt-1">{hint}</span>}
    </label>
  );
}

const CONTROL_BASE =
  'w-full bg-white dark:bg-[#1E2124] border border-stone-200 dark:border-[#2B3238] rounded-lg px-3.5 py-2.5 text-sm text-stone-900 dark:text-[#F5F7F5] ' +
  'placeholder:text-stone-400 dark:placeholder:text-[#64748B] transition-colors focus:outline-hidden focus:border-[#B7DA3E] focus:ring-2 focus:ring-[#DFFF83]/70 ' +
  'disabled:bg-stone-50 dark:disabled:bg-[#17191A] disabled:text-stone-500 dark:disabled:text-[#64748B] disabled:cursor-not-allowed';

export function TextInput({ className = '', ...props }) {
  return <input className={`${CONTROL_BASE} ${className}`} {...props} />;
}

export function SelectInput({ className = '', children, ...props }) {
  return (
    <div className="relative">
      <select className={`${CONTROL_BASE} appearance-none pr-10 cursor-pointer ${className}`} {...props}>
        {children}
      </select>
      <svg
        className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 dark:text-[#64748B]"
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/** Solid brand-green action button — Edit Profile, Save, and friends. */
export function PrimaryButton({ icon: Icon, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
        bg-[#DFFF83] text-[#17191A] hover:bg-[#C5E95A] transition-colors cursor-pointer
        disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {Icon && <Icon size={15} strokeWidth={2.5} className="shrink-0" />}
      {children}
    </button>
  );
}

/** White bordered button for secondary actions such as Cancel. */
export function SecondaryButton({ icon: Icon, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
        bg-white dark:bg-[#1E2124] text-stone-700 dark:text-[#F5F7F5] border border-stone-200 dark:border-[#2B3238] hover:bg-stone-50 dark:hover:bg-[#262B30] hover:border-stone-300 dark:hover:border-[#3D4751]
        transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {Icon && <Icon size={15} strokeWidth={2.5} className="shrink-0" />}
      {children}
    </button>
  );
}

/** Red-outline button for destructive actions. */
export function DangerButton({ icon: Icon, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
        bg-white dark:bg-[#260D12] text-rose-600 dark:text-[#FB7185] border border-rose-300 dark:border-[#4C1A24] hover:bg-rose-50 dark:hover:bg-[#341219] transition-colors cursor-pointer
        disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {Icon && <Icon size={15} strokeWidth={2.5} className="shrink-0" />}
      {children}
    </button>
  );
}

/** Inset light panel — the "Change Password" style block inside a card. */
export function InsetPanel({ title, description, action, children }) {
  return (
    <div className="bg-stone-50 dark:bg-[#1E2124] border border-stone-100 dark:border-[#2B3238] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
      <div className="min-w-0">
        {title && <h3 className="text-sm font-bold text-stone-900 dark:text-[#F5F7F5]">{title}</h3>}
        {description && <p className="text-xs text-stone-500 dark:text-[#94A3B8] mt-1">{description}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusPill({ tone = 'neutral', children }) {
  const tones = {
    active: 'bg-[#F7FFE0] text-[#4D6600] border-[#E3F5A8] dark:bg-[#142312] dark:text-[#DFFF83] dark:border-[#274220]',
    neutral: 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-[#252A2E] dark:text-[#94A3B8] dark:border-[#2B3238]',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
}

/** Labelled switch row — icon, title, gray subtitle, toggle on the right. */
export function ToggleRow({ icon: Icon, title, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-stone-100 dark:border-[#2B3238] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-[#252A2E] flex items-center justify-center shrink-0">
            <Icon size={18} strokeWidth={2.5} className="text-stone-600 dark:text-[#94A3B8]" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold text-stone-900 dark:text-[#F5F7F5]">{title}</div>
          {description && <div className="text-xs text-stone-500 dark:text-[#94A3B8] mt-0.5">{description}</div>}
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-[#DFFF83]' : 'bg-stone-300 dark:bg-[#2B3238]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

/** Label/value row used by About and other read-only lists. */
export function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-stone-100 dark:border-[#2B3238] last:border-0">
      <span className="text-sm text-stone-500 dark:text-[#94A3B8]">{label}</span>
      <span className="text-sm font-semibold text-stone-900 dark:text-[#F5F7F5] text-right">{value}</span>
    </div>
  );
}

/**
 * Flags a panel whose controls aren't backed by anything yet. Used instead of
 * shipping switches that look functional but persist nowhere the farmer can
 * rely on.
 */
export function NotWiredNote({ children }) {
  return (
    <p className="text-xs text-stone-500 dark:text-[#94A3B8] bg-stone-50 dark:bg-[#1E2124] border border-stone-100 dark:border-[#2B3238] rounded-lg px-3.5 py-2.5">
      {children}
    </p>
  );
}
