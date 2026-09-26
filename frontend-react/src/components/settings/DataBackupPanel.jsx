import { useEffect, useState } from 'react';
import { RefreshCw, CloudUpload, Download, TriangleAlert } from 'lucide-react';
import { useOfflineQueue } from '../../lib/useOfflineQueue';
import { getFailedCount, subscribe } from '../../lib/offlineQueue';
import { SettingsCard, DetailRow, PrimaryButton, NotWiredNote, InsetPanel } from './ui';

export function DataBackupPanel() {
  const { pending, sending, flush } = useOfflineQueue();
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const count = await getFailedCount();
      if (!cancelled) setFailed(count);
    };
    refresh();
    const unsubscribe = subscribe(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-5">
      <SettingsCard
        title="Data & Backup"
        description="Records saved on this phone that are waiting to reach the server."
        action={
          <PrimaryButton icon={sending ? RefreshCw : CloudUpload} onClick={flush} disabled={sending || pending === 0}>
            {sending ? 'Sending…' : 'Send now'}
          </PrimaryButton>
        }
      >
        <div>
          <DetailRow
            label="Waiting to send"
            value={pending === 0 ? 'Nothing waiting' : `${pending} ${pending === 1 ? 'entry' : 'entries'}`}
          />
          <DetailRow label="Saved on this device" value="Mortality, feed, egg and vaccination entries" />
        </div>

        {failed > 0 && (
          <div className="mt-5">
            <InsetPanel
              title={`${failed} ${failed === 1 ? 'entry' : 'entries'} could not be sent`}
              description="These were rejected by the server several times and are no longer being retried. They are still stored on this device."
            >
              <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-amber-700">
                <TriangleAlert size={14} strokeWidth={2.5} />
                <span>Needs attention</span>
              </div>
            </InsetPanel>
          </div>
        )}

        <p className="text-xs text-stone-500 mt-4">
          Entries you record without network are kept on this phone and sent by themselves once you
          are back online. You do not need to do anything.
        </p>
      </SettingsCard>

      <SettingsCard
        title="Export"
        description="Download your records as a file."
        action={
          <PrimaryButton icon={Download} disabled>
            Export
          </PrimaryButton>
        }
      >
        <NotWiredNote>
          Exporting records to a file is not built yet. When it is, your mortality, feed, egg and
          vaccination records will be downloadable from here.
        </NotWiredNote>
      </SettingsCard>
    </div>
  );
}

export default DataBackupPanel;
