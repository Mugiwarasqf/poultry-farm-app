import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { UPDATE_READY_EVENT, applyUpdate, updateIsReady } from '../../lib/pwa';

/** "A new version is ready" — sits above the bottom nav on phones. */
export function UpdateBanner() {
  const [ready, setReady] = useState(() => updateIsReady());

  useEffect(() => {
    const onReady = () => setReady(true);
    window.addEventListener(UPDATE_READY_EVENT, onReady);
    return () => window.removeEventListener(UPDATE_READY_EVENT, onReady);
  }, []);

  if (!ready) return null;

  return (
    <div
      role="status"
      className="fixed left-3 right-3 md:left-auto md:right-6 md:w-96 z-40 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6
        bg-stone-900 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3"
    >
      <span className="text-sm flex-1 min-w-0">A new version of FarmBook is ready.</span>
      <button
        type="button"
        onClick={applyUpdate}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DFFF83] hover:bg-[#C5E95A] text-sm font-semibold cursor-pointer"
      >
        <RefreshCw size={14} strokeWidth={2.5} /> Refresh
      </button>
    </div>
  );
}

export default UpdateBanner;
