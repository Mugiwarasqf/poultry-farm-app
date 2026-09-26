import { useState } from 'react';
import { Syringe, ClipboardList, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SettingsCard, ToggleRow, NotWiredNote, DetailRow } from './ui';

// Preferences are device-local for now. The two reminder jobs run on a daily
// EventBridge schedule server-side (infra/modules/notifications) and don't read
// any per-farm preference yet, so a toggle here can't actually stop an email.
// Kept honest with the note below rather than implying it does.
const STORAGE_KEY = 'farmbook_notification_prefs';

const DEFAULTS = {
  vaccinationReminders: true,
  loggingNudges: true,
};

function readPrefs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function NotificationsPanel() {
  const { farm } = useAuth();
  const [prefs, setPrefs] = useState(readPrefs);

  const update = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked — the toggle still reflects this session.
    }
  };

  return (
    <div className="space-y-5">
      <SettingsCard
        title="Notifications"
        description="Choose which alerts and reminders FarmBook sends you."
      >
        <div>
          <ToggleRow
            icon={Syringe}
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
            These switches are saved on this device only. Reminder emails are currently sent on a
            fixed daily schedule and do not yet read this setting, so turning one off will not stop
            the emails until the server side is updated.
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
