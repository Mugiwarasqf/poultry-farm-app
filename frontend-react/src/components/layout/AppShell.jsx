import { useState, useRef, useEffect } from 'react';
import {
  Menu,
  User,
  ChevronDown,
  LogOut,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { HeaderWeather } from './HeaderWeather';
import { NotificationBell } from '../notifications/NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { useOfflineQueue } from '../../lib/useOfflineQueue';
import { InventoryIcon } from '../ui/InventoryIcon';
import { BatchIcon } from '../ui/BatchIcon';
import { SettingsIcon } from '../ui/SettingsIcon';
import { HistoryIcon } from '../ui/HistoryIcon';
import { FarmIcon } from '../ui/FarmIcon';
import { OfflineBanner } from '../pwa/OfflineBanner';
import { UpdateBanner } from '../pwa/UpdateBanner';
import { EmailBounceBanner } from '../ui/EmailBounceBanner';

const VIEW_TITLES = {
  '/dashboard': 'Farm Overview',
  '/inventory': 'Inventory',
  '/history': 'History',
  '/batches': 'Batches',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
  '/batches/new': 'Create New Batch',
};

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const { farm, logout } = useAuth();
  const location = useLocation();
  const { pending, sending, flush } = useOfflineQueue();

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userMenuOpen]);

  const currentTitle =
    VIEW_TITLES[location.pathname] ||
    (location.pathname.startsWith('/batches/') ? 'Batch Details' : 'TrackFarm');

  const farmerDisplayName = farm?.farmerName || farm?.name || 'Farmer';

  // Every page inside the app uses the plain white background (it started
  // with History and the dashboard).
  return (
    <div className="min-h-screen flex selection:bg-[#DFFF83] selection:text-[#17191A] text-stone-900 dark:text-[#F5F7F5] font-sans bg-white dark:bg-[#0F1112] transition-colors">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen md:pl-62">
        {/* Top Header Bar with frosted glass blur */}
        <header className="sticky top-0 z-30 min-h-18 pt-[env(safe-area-inset-top)] bg-white/90 dark:bg-[#17191A]/90 backdrop-blur-md border-b border-[#E1E8EF] dark:border-[#2B3238] px-4 sm:px-6 lg:px-7 flex items-center justify-between gap-3 sm:gap-4 transition-all">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              className="md:hidden p-2 -ml-2 text-stone-600 dark:text-[#94A3B8] hover:text-stone-900 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-[#1E2124] transition-colors cursor-pointer"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <HeaderWeather />
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Entries saved on this device that haven't reached the server
                yet. Worded without sync/cloud jargon on purpose — the survey
                found farmers who don't recognise those terms, so this states
                plainly what happened and needs no action from them. Tapping
                retries immediately for anyone who wants it. */}
            {pending > 0 && (
              <button
                type="button"
                onClick={flush}
                disabled={sending}
                title="These entries are saved on this phone and will send by themselves"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 dark:bg-[#261B06] text-amber-800 dark:text-[#FCD34D] border border-amber-200 dark:border-[#4A350C] hover:bg-amber-100 dark:hover:bg-[#38280A] transition-colors cursor-pointer disabled:opacity-70"
              >
                {sending ? (
                  <RefreshCw size={13} className="animate-spin shrink-0" />
                ) : (
                  <Clock size={13} className="shrink-0" />
                )}
                <span className="hidden sm:inline">
                  {sending ? 'Sending…' : `${pending} waiting to send`}
                </span>
                <span className="sm:hidden">{pending}</span>
              </button>
            )}

            {/* Notification bell + recent-notifications dropdown */}
            <NotificationBell />

            {/* Profile Avatar & Name with Chevron Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 sm:gap-2.5 pl-1 pr-1.5 cursor-pointer group py-1 rounded-xl hover:bg-stone-50 dark:hover:bg-[#1E2124] transition-colors focus:outline-none"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                {/* Avatar circle */}
                <div className="w-9 h-9 rounded-full bg-[#EFFFC4] dark:bg-[#142312] text-[#4D6600] dark:text-[#DFFF83] border border-[#E3F5A8] dark:border-[#274220] flex items-center justify-center shadow-2xs shrink-0">
                  <User size={18} strokeWidth={2.2} />
                </div>

                {/* User Name in bold */}
                <span className="hidden sm:inline text-sm font-semibold text-[#142033] dark:text-[#F5F7F5] transition-colors max-w-[180px] truncate">
                  {farmerDisplayName}
                </span>

                {/* Dropdown Chevron */}
                <ChevronDown
                  size={15}
                  className={`text-stone-400 dark:text-[#64748B] group-hover:text-stone-700 dark:group-hover:text-[#F5F7F5] transition-transform duration-200 ${
                    userMenuOpen ? 'rotate-180 text-stone-800 dark:text-white' : ''
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1E2124] rounded-2xl shadow-xl border border-stone-200/90 dark:border-[#2B3238] py-1.5 z-50 animate-slide-up"
                  role="menu"
                >
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-[#FB7185] hover:bg-rose-50 dark:hover:bg-[#260D12] transition-colors cursor-pointer text-left"
                      role="menuitem"
                    >
                      <LogOut size={15} className="shrink-0" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <EmailBounceBanner />
        <OfflineBanner />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#17191A] border-t border-stone-200 dark:border-[#2B3238] px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around md:hidden shadow-lg transition-colors">
          {[
            { to: '/dashboard', icon: FarmIcon, label: 'Home' },
            { to: '/batches', icon: BatchIcon, label: 'Batches' },
            { to: '/inventory', icon: InventoryIcon, label: 'Inventory' },
            { to: '/history', icon: HistoryIcon, label: 'History' },
            { to: '/settings', icon: SettingsIcon, label: 'Settings' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'text-[#4D6600] dark:text-[#DFFF83] font-bold'
                      : 'text-stone-500 dark:text-[#94A3B8] hover:text-stone-900 dark:hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={`mb-0.5 ${isActive ? '' : 'dark:invert dark:opacity-85'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <UpdateBanner />
      </div>
    </div>
  );
}

export default AppShell;
