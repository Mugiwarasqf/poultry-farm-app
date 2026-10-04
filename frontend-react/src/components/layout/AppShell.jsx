import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Menu, User, ChevronDown, Home, Layers, Package, History, Settings, LogOut, Clock, RefreshCw } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from '../notifications/NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { useOfflineQueue } from '../../lib/useOfflineQueue';

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

  const farmerDisplayName = farm?.farmerName || farm?.name || 'Samuel';

  // Pages using the plain white background, where cards are defined by a soft
  // shadow instead of a border. Add routes here to roll it out further.
  // The batch detail route is matched on its own so the /batches list and the
  // /batches/new wizard keep the tinted background.
  const WHITE_BG_ROUTES = ['/history'];
  const isBatchDetail = /^\/batches\/(?!new$)[^/]+$/.test(location.pathname);
  const useWhiteBackground =
    isBatchDetail || WHITE_BG_ROUTES.some((route) => location.pathname.startsWith(route));

  return (
    <div
      className={`min-h-screen flex selection:bg-[#0D5C3A] selection:text-white text-stone-900 font-sans ${
        useWhiteBackground ? 'bg-white' : 'bg-[#FAFAF9]'
      }`}
    >
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen md:pl-60">
        {/* Top Header Bar with frosted glass blur */}
        <header className="sticky top-0 z-30 h-16 bg-white/75 backdrop-blur-md border-b border-stone-200/50 px-4 sm:px-8 flex items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
           
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-70"
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
                className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-stone-200 cursor-pointer group py-1 rounded-xl hover:bg-stone-50 transition-colors focus:outline-none"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                {/* Avatar circle */}
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#0D5C3A] border border-emerald-200 flex items-center justify-center text-xs font-bold shadow-2xs overflow-hidden shrink-0">
                  <img
                    src="/images/irvan-maulana-ENQIxReDFKE-unsplash.jpg"
                    alt={farmerDisplayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                 
                </div>

                {/* User Name in bold */}
                <span className="text-xs sm:text-sm font-bold text-stone-900  transition-colors max-w-[130px] sm:max-w-[180px] truncate">
                  {farmerDisplayName}
                </span>

                {/* Dropdown Chevron */}
                <ChevronDown
                  size={15}
                  className={`text-stone-400 group-hover:text-stone-700 transition-transform duration-200 ${
                    userMenuOpen ? 'rotate-180 text-stone-800' : ''
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200/90 py-1.5 z-50 animate-slide-up"
                  role="menu"
                >
                 

                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
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

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-200 px-4 py-2 flex items-center justify-around md:hidden shadow-lg">
          {[
            { to: '/dashboard', icon: Home, label: 'Home' },
            { to: '/batches', icon: Layers, label: 'Batches' },
            { to: '/inventory', icon: Package, label: 'Inventory' },
            { to: '/history', icon: History, label: 'History' },
            { to: '/settings', icon: Settings, label: 'Settings' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1 text-xs font-semibold transition-colors ${
                    isActive ? 'text-[#0D5C3A] font-bold' : 'text-stone-500 hover:text-stone-900'
                  }`
                }
              >
                <Icon size={18} className="mb-0.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default AppShell;
