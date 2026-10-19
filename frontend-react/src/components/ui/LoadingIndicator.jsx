import { useEffect, useState } from 'react';

// After this long the message changes, so a slow network doesn't feel stuck.
const SLOW_AFTER_MS = 4000;

/**
 * The app's full-page loading screen: an advanced multi-ring spinner with a
 * pulsing logo, lime accent glow, and a subtle status line.
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
    <div
      role="progressbar"
      aria-label={label}
      aria-busy="true"
      className="flex flex-col items-center gap-8"
    >
      {/* Advanced multi-ring spinner */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer ring — slow */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-[3px] border-[#DFFF83]/20 border-t-[#DFFF83] animate-spin"
          style={{ animationDuration: '1.4s' }}
        />
        {/* Middle ring — medium, reverse */}
        <span
          aria-hidden="true"
          className="absolute inset-[7px] rounded-full border-[2.5px] border-[#B7DA3E]/15 border-b-[#B7DA3E] animate-spin"
          style={{ animationDuration: '1s', animationDirection: 'reverse' }}
        />
        {/* Inner ring — fast */}
        <span
          aria-hidden="true"
          className="absolute inset-[14px] rounded-full border-2 border-[#17191A]/10 border-t-[#17191A]/60 animate-spin"
          style={{ animationDuration: '0.7s' }}
        />
        {/* Logo in center */}
        <img
          src="/icon/logo.png"
          alt="TrackFarm"
          className="w-7 h-7 object-contain select-none mix-blend-multiply animate-pulse"
          draggable="false"
        />
      </div>

      {/* Status text */}
      <p className="text-[13px] font-medium tracking-wide text-[#70829B]" aria-live="polite">
        {slow ? 'Still loading, hang tight…' : label}
      </p>
    </div>
  );
}

export default LoadingIndicator;
