import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SettingsCard, DetailRow } from './ui';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun, available: true, description: 'Clean, bright layout' },
  { value: 'dark', label: 'Dark', icon: Moon, available: true, description: 'Deep farm charcoal & lime' },
  { value: 'system', label: 'System', icon: Monitor, available: true, description: 'Matches your device mode' },
];

export function AppearancePanel() {
  const { theme, setTheme, resolvedTheme } = useTheme();

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
                onClick={() => setTheme(option.value)}
                className={`relative rounded-xl border p-4 text-left transition-all cursor-pointer
                  ${
                    selected
                      ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-900/10 dark:border-[#DFFF83] dark:bg-[#142312] dark:ring-[#DFFF83]/20 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/50 dark:border-[#2B3238] dark:bg-[#1E2124] dark:hover:border-[#3D4751] dark:hover:bg-[#252A2E]'
                  }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      selected
                        ? 'bg-stone-900 text-white dark:bg-[#DFFF83] dark:text-[#17191A]'
                        : 'bg-stone-100 text-stone-600 dark:bg-[#252A2E] dark:text-[#94A3B8]'
                    }`}
                  >
                    <Icon size={18} strokeWidth={2.25} />
                  </div>
                  {selected && (
                    <span className="w-5 h-5 rounded-full bg-stone-900 dark:bg-[#DFFF83] text-white dark:text-[#17191A] flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-stone-900 dark:text-[#F5F7F5]">
                  {option.label}
                </div>
                <div className="text-xs text-stone-500 dark:text-[#94A3B8] mt-1">
                  {option.description}
                </div>
              </button>
            );
          })}
        </div>

        {theme === 'system' && (
          <div className="mt-4 p-3 rounded-lg bg-stone-50 dark:bg-[#1E2124] border border-stone-200 dark:border-[#2B3238] text-xs text-stone-600 dark:text-[#94A3B8] flex items-center gap-2">
            <Monitor size={15} className="shrink-0 text-stone-500 dark:text-[#DFFF83]" />
            <span>
              Currently matching your operating system setting (active: <strong className="text-stone-900 dark:text-white capitalize">{resolvedTheme}</strong>).
            </span>
          </div>
        )}
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
