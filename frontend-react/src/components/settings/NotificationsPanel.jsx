import { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Mail,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateFarm } from '../../api/farms';
import { SettingsCard, ToggleRow, DetailRow, StatusPill } from './ui';
import { PREFS_EVENT, readPrefs, writePrefs } from '../../lib/notifications/prefs';
import { VaccineIcon } from '../ui/VaccineIcon';

export function NotificationsPanel() {
  const { farm, farmId, updateFarmProfile } = useAuth();
  const [prefs, setPrefs] = useState(readPrefs);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleSync = () => setPrefs(readPrefs());
    window.addEventListener(PREFS_EVENT, handleSync);
    return () => window.removeEventListener(PREFS_EVENT, handleSync);
  }, []);

  const update = async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    writePrefs(next);

    if (farmId) {
      try {
        setSaving(true);
        await updateFarm(farmId, { notificationPrefs: next });
        updateFarmProfile({ notificationPrefs: next });
      } catch (err) {
        console.warn('Could not sync notification preferences to cloud:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const recipientEmail = farm?.ownerEmail || farm?.email || '';

  return (
    <div className="space-y-5">
      {/* Email Reminders Channel */}
      <SettingsCard
        title="Email Reminders"
        description="Automated reminder emails sent by TrackFarm to your inbox."
        action={
          <StatusPill tone={prefs.emailAlerts ? 'active' : 'neutral'}>
            {prefs.emailAlerts ? 'Active' : 'Paused'}
          </StatusPill>
        }
      >
        <div>
          <ToggleRow
            icon={Mail}
            title="Daily email reminders"
            description="Receive scheduled morning emails for upcoming vaccinations and missing daily logs."
            checked={Boolean(prefs.emailAlerts)}
            onChange={(val) => update('emailAlerts', val)}
          />
        </div>
        <p className="text-xs text-stone-500 dark:text-[#94A3B8] mt-3">
          {prefs.emailAlerts
            ? `Emails will be sent to ${recipientEmail || 'your sign-in email address'} based on the alerts enabled below.`
            : 'All automated reminder emails are paused. In-app notifications will still function according to your choices below.'}
        </p>
      </SettingsCard>

      {/* In-App Alerts Configuration */}
      <SettingsCard
        title="Alerts & Reminders"
        description="Choose which alerts, reminders, and activity updates appear in TrackFarm."
      >
        <div>
          <ToggleRow
            icon={VaccineIcon}
            title="Vaccination reminders"
            description="Alerts 3 days before scheduled vaccinations and on the due date, plus urgent overdue flags."
            checked={Boolean(prefs.vaccinationReminders)}
            onChange={(val) => update('vaccinationReminders', val)}
          />
          <ToggleRow
            icon={ClipboardList}
            title="Daily logging reminder"
            description="An evening nudge when a day passes without any feed, egg, or mortality records entered."
            checked={Boolean(prefs.loggingNudges)}
            onChange={(val) => update('loggingNudges', val)}
          />
          <ToggleRow
            icon={Package}
            title="Feed stock alerts"
            description="Warnings when feed stock drops below re-order level or runs completely out in your store."
            checked={Boolean(prefs.feedAlerts)}
            onChange={(val) => update('feedAlerts', val)}
          />
          <ToggleRow
            icon={ShieldCheck}
            title="Medications & withdrawal periods"
            description="Notices when vitamin/dewormer courses start and when egg or meat withdrawal periods safely end."
            checked={Boolean(prefs.medicationAlerts)}
            onChange={(val) => update('medicationAlerts', val)}
          />
          <ToggleRow
            icon={Activity}
            title="Activity updates"
            description="Feed recorded notices and mortality logs entered for your active batches."
            checked={Boolean(prefs.activityLogs)}
            onChange={(val) => update('activityLogs', val)}
          />
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-stone-600 dark:text-[#94A3B8] bg-stone-50 dark:bg-[#1E2124] border border-stone-200/60 dark:border-[#2B3238] rounded-lg px-3.5 py-2.5">
          <CheckCircle2 size={16} className="text-[#84A818] shrink-0" />
          <span>
            Settings are synced with your farm account and take effect in the notification bell and list immediately.
          </span>
        </div>
      </SettingsCard>

      {/* Delivery Destination */}
      <SettingsCard title="Where reminders are sent" description="Reminders are delivered to your registered email address.">
        <div>
          <DetailRow
            label={
              <span className="inline-flex items-center gap-2">
                <Mail size={15} strokeWidth={2.5} className="text-stone-400 dark:text-[#94A3B8]" />
                Email address
              </span>
            }
            value={recipientEmail || '—'}
          />
          <DetailRow
            label="Email delivery status"
            value={
              prefs.emailAlerts
                ? 'Active (Scheduled runs check daily)'
                : 'Paused by user'
            }
          />
          <DetailRow label="Text message (SMS)" value="Not available" />
          <DetailRow label="Phone push notification" value="Not available" />
        </div>
      </SettingsCard>
    </div>
  );
}

export default NotificationsPanel;
