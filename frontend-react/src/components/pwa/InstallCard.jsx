import { useEffect, useState } from 'react';
import { Download, Share, CheckCircle2 } from 'lucide-react';
import { INSTALL_CHANGED_EVENT, installState, promptInstall } from '../../lib/pwa';

function useInstallState() {
  const [state, setState] = useState(() => installState());
  useEffect(() => {
    const update = () => setState(installState());
    window.addEventListener(INSTALL_CHANGED_EVENT, update);
    return () => window.removeEventListener(INSTALL_CHANGED_EVENT, update);
  }, []);
  return state;
}

function IosSteps() {
  return (
    <span>
      In Safari, tap <Share size={13} className="inline -mt-0.5" aria-label="Share" /> Share, then{' '}
      <span className="font-semibold">Add to Home Screen</span>.
    </span>
  );
}

/** Settings → About row: always there, says what the farmer can do on this phone. */
export function InstallRow() {
  const state = useInstallState();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-stone-900">App on your phone</div>
        <div className="text-xs text-stone-500 mt-0.5">
          {state === 'installed' && 'FarmBook is installed on this device.'}
          {state === 'prompt' && 'Add FarmBook to your home screen.'}
          {state === 'ios' && <IosSteps />}
          {state === 'unavailable' &&
            'Open FarmBook in Chrome on Android, or Safari on iPhone, to add it to your home screen.'}
        </div>
      </div>
      {state === 'installed' && (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 shrink-0">
          <CheckCircle2 size={14} strokeWidth={2.5} /> Installed
        </span>
      )}
      {state === 'prompt' && (
        <button
          type="button"
          onClick={promptInstall}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0D5C3A] text-white hover:bg-[#094229] cursor-pointer shrink-0"
        >
          <Download size={15} strokeWidth={2.5} /> Install app
        </button>
      )}
    </div>
  );
}
