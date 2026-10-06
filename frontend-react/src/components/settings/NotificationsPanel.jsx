import { useState } from 'react';
import { ClipboardList, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SettingsCard, ToggleRow, NotWiredNote, DetailRow } from './ui';
import { readPrefs, writePrefs } from '../../lib/notifications/prefs';
import { VaccineIcon } from '../ui/VaccineIcon';

// Preferences are device-local. They control the in-app notifications (the
// header bell and /notifications) straight away. The two reminder emails run
// on a daily EventBridge schedule server-side (infra/modules/notifications)
// and don't read any per-farm preference yet — kept honest in the note below.
export function NotificationsPanel() {
  const { farm } = useAuth();
  const [prefs, setPrefs] = useState(readPrefs);

  const update = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    writePrefs(next);
  };

  return (
    <div className="space-y-5">
      <SettingsCard
        title="Notifications"
        description="Choose which alerts and reminders FarmBook sends you."
      >
        <div>
          <ToggleRow
            icon={VaccineIcon}
            title="Vaccination reminders"
            description="A reminder a few days before a scheduled vaccination, and again on the day."
            checked={prefs.vaccinationReminders}
            onChange={(value) => update('vaccinationReminders', value)}
          />
          <ToggleRow
            icon={ClipboardList}
            title="Daily logging reminder"
            description="A nudge when a day passes with nothing recorded for your batches."
            checked={prefs.loggingNudges}
            onChange={(value) => update('loggingNudges', value)}
          />
        </div>

        <div className="mt-5">
          <NotWiredNote>
            These switches are saved on this device and turn the matching alerts in your
            notifications list on or off straight away. Reminder emails are sent on a fixed daily
            schedule and do not read this setting yet, so turning one off will not stop the emails.
          </NotWiredNote>
        </div>
      </SettingsCard>

      <SettingsCard title="Where reminders are sent" description="Reminders go to your sign-in email address.">
        <div>
          <DetailRow
            label={
              <span className="inline-flex items-center gap-2">
                <Mail size={15} strokeWidth={2.5} className="text-stone-400" />
                Email address
              </span>
            }
            value={farm?.ownerEmail || farm?.email || '—'}
          />
          <DetailRow label="Text message (SMS)" value="Not available" />
          <DetailRow label="Phone push notification" value="Not available" />
        </div>
      </SettingsCard>
    </div>
  );
}

export default NotificationsPanel;
