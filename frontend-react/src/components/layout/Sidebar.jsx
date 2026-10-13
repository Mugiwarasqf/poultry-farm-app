import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { badgeCount } from '../../lib/notifications/format';
import { InventoryIcon } from '../ui/InventoryIcon';
import { BatchIcon } from '../ui/BatchIcon';
import { SettingsIcon } from '../ui/SettingsIcon';
import { HistoryIcon } from '../ui/HistoryIcon';
import { FarmIcon } from '../ui/FarmIcon';
import { BellIcon } from '../ui/BellIcon';

/*
 * Dark sidebar. The app's icons are black PNG glyphs, so on the charcoal
 * background they are inverted to white; the active item sits on a pale lime
 * pill, where the glyph stays black. The logo PNG has an opaque white
 * background, so it is inverted and screen-blended: the white box turns black
 * and disappears into the charcoal, leaving a white bird and wordmark.
 */
export function Sidebar({ isOpen, onClose }) {
  const { unreadCount } = useNotifications();

  const navItems = [
    { to: '/dashboard', label: 'Home', icon: FarmIcon },
    { to: '/batches', label: 'Batches', icon: BatchIcon },
    { to: '/inventory', label: 'Inventory', icon: InventoryIcon },
    { to: '/history', label: 'History', icon: HistoryIcon },
    { to: '/notifications', label: 'Notifications', icon: BellIcon, count: unreadCount },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-200 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 left-0 h-screen w-62 bg-[#17191A] text-[#F5F7F5] flex flex-col z-40 transition-transform duration-200 ease-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-20 px-6 flex items-center justify-between shrink-0">
          <a href="/dashboard" className="flex items-center focus:outline-hidden">
            <img src="/icon/logo.png" alt="FarmBook" className="h-9 w-auto invert mix-blend-screen" />
          </a>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-4 pt-2 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-[#DFFF83] text-[#17191A] font-semibold'
                      : 'text-[#F5F7F5]/90 hover:bg-white/8 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} className={isActive ? '' : 'invert opacity-90'} />
                    <span className="flex-1">{item.label}</span>
                    {item.count > 0 && (
                      <>
                        <span
                          aria-hidden="true"
                          className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold leading-5 text-center tabular-nums ${
                            isActive ? 'bg-[#17191A] text-white' : 'bg-[#DFFF83] text-[#17191A]'
                          }`}
                        >
                          {badgeCount(item.count)}
                        </span>
                        <span className="sr-only">, {item.count} unread</span>
                      </>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer: the farm slogan illustration ("Healthy Birds • Better
            Yields"). It's a transparent PNG with dark line art, so it's
            turned white (brightness-0 invert) to read on the charcoal, the
            same way the nav icons are. */}
        <div className="pb-5 pt-3 shrink-0 flex justify-center">
          <img
            src="/images/svg.png"
            alt="Healthy Birds, Better Yields"
            className="w-36 h-36 object-contain brightness-0 invert opacity-90"
          />
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
