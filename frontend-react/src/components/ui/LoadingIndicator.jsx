import { useEffect, useState } from 'react';

// After this long the message changes, so a slow network doesn't feel stuck.
const SLOW_AFTER_MS = 4000;

/**
 * The app's loading screen: the FarmBook logo breathing gently above a slim
 * bar that sweeps across, lime into charcoal, with a quiet status line.
 * Keyframes live in styles/index.css (`.loader*`). People who ask for reduced
 * motion get a still version.
 *
 * @param {Object} props
 * @param {string} [props.label]  What's loading, shown and read out.
 */
export function LoadingIndicator({ label = 'Loading' }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="progressbar" aria-label={label} aria-busy="true" className="loader flex flex-col items-center">
      <img src="/icon/logo.png" alt="FarmBook" className="loader__logo h-11 w-auto select-none mix-blend-multiply" draggable="false" />

      <div className="mt-7 h-[3px] w-40 rounded-full bg-[#17191A]/8 overflow-hidden" aria-hidden="true">
        <div className="loader__bar h-full w-2/5 rounded-full bg-gradient-to-r from-[#DFFF83] via-[#B7DA3E] to-[#17191A]" />
      </div>

      <p className="mt-4 text-[13px] font-medium tracking-wide text-[#70829B]" aria-live="polite">
        {slow ? 'Still loading, hang tight…' : label}
      </p>
    </div>
  );
}

export default LoadingIndicator;
