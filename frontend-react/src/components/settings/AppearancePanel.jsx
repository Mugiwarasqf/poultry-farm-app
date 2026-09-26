import { useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { SettingsCard, NotWiredNote, DetailRow } from './ui';

// Only the light theme is actually implemented. The options are shown so the
// screen matches the rest of settings, but dark and system are marked
// unavailable rather than letting someone pick a theme that never applies.
const THEMES = [
  { value: 'light', label: 'Light', icon: Sun, available: true },
  { value: 'dark', label: 'Dark', icon: Moon, available: false },
  { value: 'system', label: 'System', icon: Monitor, available: false },
];

export function AppearancePanel() {
  const [theme, setTheme] = useState('light');

  return (
    <div className="space-y-5">
      <SettingsCard title="Appearance" description="Theme and display preferences.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEMES.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={!option.available}
                onClick={() => option.available && setTheme(option.value)}
                className={`relative rounded-lg border p-4 text-left transition-colors
                  ${selected ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300'}
                  ${option.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
              >
                <Icon size={18} strokeWidth={2.5} className="text-stone-600 mb-2" />
                <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  {option.label}
                  {selected && <Check size={14} strokeWidth={3} className="text-stone-900" />}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {option.available ? 'Available' : 'Not available yet'}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <NotWiredNote>
            FarmBook currently ships with the light theme only. Dark and system themes will appear
            here once they are built.
          </NotWiredNote>
        </div>
      </SettingsCard>

      <SettingsCard title="Display" description="How information is shown across the app.">
        <div>
          <DetailRow label="Language" value="English" />
          <DetailRow label="Currency" value="Naira (₦)" />
          <DetailRow label="Date format" value="12 Apr 2025" />
        </div>
      </SettingsCard>
    </div>
  );
}

export default AppearancePanel;
