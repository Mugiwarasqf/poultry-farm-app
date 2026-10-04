import { NavLink } from 'react-router-dom';
import { Home, Layers, Package, History, Settings, X, Sprout, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { badgeCount } from '../../lib/notifications/format';

export function Sidebar({ isOpen, onClose }) {
  const { logout } = useAuth();
  const { unreadCount } = useNotifications();
  const onSignOut = () => {
    onClose?.();
    logout();
  };

  const navItems = [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: '/batches', label: 'Batches', icon: Layers },
    { to: '/inventory', label: 'Inventory', icon: Package },
    { to: '/history', label: 'History', icon: History },
    { to: '/notifications', label: 'Notifications', icon: Bell, count: unreadCount },
    { to: '/settings', label: 'Settings', icon: Settings },
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

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 h-screen w-60 bg-white border-r border-stone-200 flex flex-col justify-between z-40 transition-transform duration-200 ease-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand header with TrackFarm logo & green sprout mark */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-stone-100">
            <a href="/dashboard" className="flex items-center gap-2 focus:outline-hidden">
              <img src="/icon/logo.png" alt="TrackFarm" className="h-8 w-auto" />
            </a>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Clean Navigation Matching Reference Image */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3.5 px-4 py-3 rounded-[5px] text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#047857] text-white shadow-xs'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={19} />
                      <span className="flex-1">{item.label}</span>
                      {item.count > 0 && (
                        <>
                          <span
                            aria-hidden="true"
                            className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold leading-5 text-center tabular-nums ${
                              isActive ? 'bg-white/20 text-white' : 'bg-stone-900 text-white'
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
        </div>

        {/* Footer: chicken illustration + tagline, then sign out */}
        <div className="pb-4">
          <div className="flex items-center flex-col gap-1 px-3 py-2 text-stone-400">
            <div className="w-32 h-32 flex items-center justify-center">
              <img src="/images/svg.png" alt="" className="w-full h-full object-contain" />
            </div>
           
          </div>

          
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
