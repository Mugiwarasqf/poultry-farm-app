import { useNavigate, useParams } from 'react-router-dom';
import {
  UserCircle,
  Home,
  Palette,
  Database,
  Info,
  ChevronRight,
} from 'lucide-react';
import { AccountPanel } from '../components/settings/AccountPanel';
import { FarmDetailsPanel } from '../components/settings/FarmDetailsPanel';
import { NotificationsPanel } from '../components/settings/NotificationsPanel';
import { AppearancePanel } from '../components/settings/AppearancePanel';
import { DataBackupPanel } from '../components/settings/DataBackupPanel';
import { AboutPanel } from '../components/settings/AboutPanel';
import { BellIcon } from '../components/ui/BellIcon';

/**
 * Every settings sub-page renders inside this same shell: the category list
 * stays on the left and only the right-hand panel changes. Sections are driven
 * by the URL (/settings/:section) so each one is linkable and the browser back
 * button behaves, rather than being hidden behind component state.
 */
const SECTIONS = [
  {
    id: 'account',
    label: 'Account',
    description: 'Personal information and login',
    icon: UserCircle,
    Panel: AccountPanel,
  },
  {
    id: 'farm',
    label: 'Farm Details',
    description: 'Farm information and location',
    icon: Home,
    Panel: FarmDetailsPanel,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Alerts and reminders',
    icon: BellIcon,
    Panel: NotificationsPanel,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme and display preferences',
    icon: Palette,
    Panel: AppearancePanel,
  },
  {
    id: 'data',
    label: 'Data & Backup',
    description: 'Export and backup your data',
    icon: Database,
    Panel: DataBackupPanel,
  },
  {
    id: 'about',
    label: 'About',
    description: 'App version and support',
    icon: Info,
    Panel: AboutPanel,
  },
];

export function SettingsPage() {
  const { section } = useParams();
  const navigate = useNavigate();

  const active = SECTIONS.find((item) => item.id === section) || SECTIONS[0];
  const ActivePanel = active.Panel;

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-heading">Settings</h1>
        <p className="text-sm text-stone-500 mt-1.5">
          Manage your account, farm preferences, and app settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 items-start">
        {/* Category list — stays visible beside every sub-page on desktop and
            stacks above the panel on smaller screens. */}
        <nav className="bg-white rounded-xl border border-stone-200 shadow-xs p-2" aria-label="Settings sections">
          {SECTIONS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === active.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id === 'account' ? '/settings' : `/settings/${item.id}`)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
                  isActive ? 'bg-stone-100' : 'hover:bg-stone-50'
                }`}
              >
                <Icon size={20} strokeWidth={2.25} className="text-stone-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-stone-900 truncate">{item.label}</div>
                  <div className="text-xs text-stone-500 truncate">{item.description}</div>
                </div>
                <ChevronRight size={16} strokeWidth={2.5} className="text-stone-400 shrink-0" />
              </button>
            );
          })}
        </nav>

        {/* Only this side changes between sub-pages. */}
        <div className="min-w-0">
          <ActivePanel />
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
