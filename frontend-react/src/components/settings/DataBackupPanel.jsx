import { useEffect, useState } from 'react';
import { RefreshCw, CloudUpload, Download, TriangleAlert, FileText, Sheet } from 'lucide-react';
import { useOfflineQueue } from '../../lib/useOfflineQueue';
import { getFailedCount, subscribe } from '../../lib/offlineQueue';
import { collectFarmData, saveFile, fileSlug } from '../../lib/farmData';
import { EXPORT_TYPES, buildExportSections, toCsv } from '../../lib/exportRecords';
import { downloadMultiTableReport } from '../../lib/report';
import { useAuth } from '../../context/AuthContext';
import { useBatches } from '../../context/BatchContext';
import { useToast } from '../ui/Toast';
import { SettingsCard, DetailRow, PrimaryButton, SecondaryButton, InsetPanel } from './ui';

const today = () => new Date().toISOString().slice(0, 10);

export function DataBackupPanel() {
  const { pending, sending, flush } = useOfflineQueue();
  const { farm } = useAuth();
  const { batches } = useBatches();
  const toast = useToast();
  const [failed, setFailed] = useState(0);
  const [backingUp, setBackingUp] = useState(false);
  const [exporting, setExporting] = useState(null); // null | 'pdf' | 'csv'

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

  const slug = fileSlug(farm?.name);

  const warnAbout = (warnings) => {
    if (!warnings.length) return;
    const shown = warnings.slice(0, 3).join(', ');
    const more = warnings.length > 3 ? ` and ${warnings.length - 3} more` : '';
    toast(`Some records could not be loaded: ${shown}${more}. Try again with better network.`, 'error');
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const data = await collectFarmData({ farm, batches });
      const backup = { app: 'FarmBook', version: 1, exportedAt: new Date().toISOString(), ...data };
      saveFile(`farmbook-backup-${slug}-${today()}.json`, JSON.stringify(backup, null, 2), 'application/json');
      toast('Backup saved to this device', 'success');
      warnAbout(data.warnings);
    } catch (err) {
      toast(err.message || 'Could not make the backup', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const data = await collectFarmData({ farm, batches });
      const sections = buildExportSections(data, EXPORT_TYPES.map((t) => t.id));
      if (format === 'pdf') {
        await downloadMultiTableReport({
          filename: `farmbook-records-${slug}-${today()}.pdf`,
          title: 'Farm Records',
          subtitle: farm?.name || undefined,
          sections,
        });
      } else {
        sections.forEach((s) => {
          saveFile(`farmbook-${s.id}-${slug}-${today()}.csv`, toCsv(s.headers, s.rows), 'text/csv;charset=utf-8');
        });
      }
      toast(format === 'pdf' ? 'Records downloaded as a PDF' : `${sections.length} CSV ${sections.length === 1 ? 'file' : 'files'} downloaded`, 'success');
      warnAbout(data.warnings);
    } catch (err) {
      toast(err.message || 'Could not export records', 'error');
    } finally {
      setExporting(null);
    }
  };

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
        title="Backup file"
        description="Your records are already saved to your FarmBook account. This saves a copy on this device that you can keep."
        action={
          <PrimaryButton icon={backingUp ? RefreshCw : Download} onClick={handleBackup} disabled={backingUp}>
            {backingUp ? 'Preparing…' : 'Download backup'}
          </PrimaryButton>
        }
      >
        <p className="text-xs text-stone-500">
          One file with all your batches, pens and every record: mortality, feed, eggs, vaccinations,
          vitamins, weight and sick bay. Keep it on your phone or send it to yourself.
        </p>
      </SettingsCard>

      <SettingsCard
        title="Export records"
        description="Download all your records as a table to print, share or open in Excel."
        action={
          <div className="flex flex-wrap gap-2">
            <PrimaryButton icon={exporting === 'pdf' ? RefreshCw : FileText} onClick={() => handleExport('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? 'Preparing…' : 'PDF'}
            </PrimaryButton>
            <SecondaryButton icon={exporting === 'csv' ? RefreshCw : Sheet} onClick={() => handleExport('csv')} disabled={!!exporting}>
              {exporting === 'csv' ? 'Preparing…' : 'Excel (CSV)'}
            </SecondaryButton>
          </div>
        }
      >
        <p className="text-xs text-stone-500">
          Every batch, mortality, feed, eggs, vaccinations, vitamins and weight. PDF is best on a phone;
          Excel gives one file per record type.
        </p>
      </SettingsCard>
    </div>
  );
}

export default DataBackupPanel;
