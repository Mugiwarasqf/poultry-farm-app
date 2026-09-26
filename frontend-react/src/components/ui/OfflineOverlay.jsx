import { useState, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';

/**
 * OfflineOverlay
 * Detects navigator online/offline events.
 * - Shows a blurred, darkened overlay when the device loses connectivity.
 * - Auto-dismisses and shows a "back online" toast when connectivity returns.
 * - "Try Again" button re-checks connectivity and optionally refreshes.
 */
export function OfflineOverlay() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setJustReconnected(false);
  }, []);

  const handleOnline = useCallback(() => {
    setIsOffline(false);
    setJustReconnected(true);
    // Auto-hide the "back online" toast after 3s
    setTimeout(() => setJustReconnected(false), 3000);
  }, []);

  useEffect(() => {
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [handleOffline, handleOnline]);

  const handleRetry = async () => {
    setRetrying(true);
    // Give the browser a moment to re-check connectivity
    await new Promise(r => setTimeout(r, 1200));
    if (navigator.onLine) {
      setIsOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    } else {
      // Still offline — reload to force a network check
      window.location.reload();
    }
    setRetrying(false);
  };

  return (
    <>
      {/* ── OFFLINE OVERLAY ── */}
      {isOffline && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-label="You are offline"
        >
          {/* Blurred dark backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)' }}
          />

          {/* Modal card */}
          <div
            className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-auto p-8 text-center space-y-6 animate-fade-in"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* Pulsing WiFi-off icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-rose-100 animate-ping opacity-60" />
                <div className="relative w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center">
                  <WifiOff size={36} className="text-rose-500" />
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-stone-950 font-heading">
                You're Offline
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                It looks like you've lost your internet connection. FarmBook needs connectivity to sync your farm data.
              </p>
            </div>

            {/* Connection status indicator */}
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-2xl">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="text-xs font-bold text-rose-700">No internet connection detected</span>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full py-3.5 rounded-2xl bg-[#0D5C3A] hover:bg-[#094229] active:bg-[#063823] text-white font-bold text-sm transition-all inline-flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-70"
              >
                {retrying ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Checking connection…</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Try Again</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-stone-400 font-medium">
                Your existing data is still accessible · changes will sync when reconnected
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── BACK ONLINE TOAST ── */}
      {justReconnected && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 bg-[#0D5C3A] text-white rounded-2xl shadow-lg flex items-center gap-2.5 text-sm font-bold animate-fade-in"
          role="status"
          aria-live="polite"
          style={{ animation: 'slideUp 0.25s ease-out' }}
        >
          <Wifi size={18} />
          <span>You're back online!</span>
        </div>
      )}

      {/* Keyframe animation */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </>
  );
}

export default OfflineOverlay;
