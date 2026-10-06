import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { OFFLINE_DATA_EVENT } from '../../lib/pwa';

function formatSavedAt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
}

/**
 * Shown while there's no network. Pages keep showing the records this phone
 * saved the last time they were opened online; new entries still save and
 * send later through the offline queue.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      setSavedAt(null);
    };
    // Keep the oldest time seen: the banner should not overstate freshness.
    const onCached = (e) => {
      const at = e.detail?.cachedAt;
      if (at) setSavedAt((prev) => (!prev || at < prev ? at : prev));
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    window.addEventListener(OFFLINE_DATA_EVENT, onCached);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      window.removeEventListener(OFFLINE_DATA_EVENT, onCached);
    };
  }, []);

  if (!offline) return null;
  const when = savedAt ? formatSavedAt(savedAt) : null;

  return (
    <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 sm:px-8 py-2 text-xs sm:text-sm flex items-start gap-2">
      <WifiOff size={15} strokeWidth={2.5} className="shrink-0 mt-0.5" />
      <span className="min-w-0">
        You're offline. Showing records saved on this phone{when ? ` (from ${when})` : ''}. New entries are kept and
        sent once you're back online.
      </span>
    </div>
  );
}

export default OfflineBanner;
