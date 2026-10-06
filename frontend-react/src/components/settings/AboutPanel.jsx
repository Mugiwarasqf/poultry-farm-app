import { useAuth } from '../../context/AuthContext';
import { SettingsCard, DetailRow } from './ui';
import { InstallRow } from '../pwa/InstallCard';

export function AboutPanel() {
  const { farmId } = useAuth();

  return (
    <div className="space-y-5">
      <SettingsCard title="About FarmBook" description="App version and support information.">
        <div>
          <DetailRow label="Version" value="v1.0.0" />
          <DetailRow label="Farm ID" value={farmId ? `${farmId.slice(0, 8)}…` : '—'} />
          <DetailRow
            label="Status"
            value={
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Active
              </span>
            }
          />
          <DetailRow label="Plan" value="Free trial" />
        </div>
      </SettingsCard>

      <SettingsCard title="Install" description="Use FarmBook like any other app on your phone.">
        <InstallRow />
      </SettingsCard>

      <SettingsCard title="Support" description="Get help with FarmBook.">
        <p className="text-sm text-stone-600 leading-relaxed">
          FarmBook replaces the paper record book with simple digital tracking for mortality, feed,
          egg production and vaccinations. If something is not working, note what you were doing at
          the time and reach out to the person who set up your farm.
        </p>
      </SettingsCard>
    </div>
  );
}

export default AboutPanel;
