import {
  AlarmClock,
  Bird,
  CircleCheck,
  ClipboardList,
  FileText,
  Package,
  PackageX,
  Pill,
  Settings,
  ShieldCheck,
  Syringe,
  TriangleAlert,
} from 'lucide-react';

/**
 * Everything about how each kind of notification is filed and drawn, in one
 * place: its filter category, the tint of its round icon background, and its
 * icon.
 *
 * ICONS: the glyph is always outline, black on a soft tint. `file` is where a
 * custom SVG goes — drop it into public/icons and set e.g.
 * `file: '/icons/syringe.svg'`; NotificationIcon then uses that file instead
 * of the Lucide stand-in in `icon`. Nothing else needs to change.
 *
 * @typedef {'system' | 'batches' | 'health' | 'inventory' | 'reminders'} NotificationCategory
 *
 * @typedef {Object} NotificationMeta
 * @property {NotificationCategory} category
 * @property {string} tint                     Tailwind background class for the circle.
 * @property {import('react').ComponentType<any>} icon  Lucide stand-in glyph.
 * @property {string} [file]                   Custom SVG in /public, used when set.
 */

/** @type {Record<string, NotificationMeta>} */
export const NOTIFICATION_META = {
  batch_completed: { category: 'batches', tint: 'bg-[#EFFFC4] dark:bg-[#142312] text-[#4D6600] dark:text-[#DFFF83]', icon: CircleCheck },
  bird_lost: { category: 'batches', tint: 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300', icon: Bird },
  vaccination_due: { category: 'reminders', tint: 'bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300', icon: Syringe, file: '/icon/injection.png' },
  vaccination_overdue: { category: 'health', tint: 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300', icon: TriangleAlert },
  supplement_added: { category: 'health', tint: 'bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300', icon: Pill, file: '/icon/pill.png' },
  withdrawal_ended: { category: 'health', tint: 'bg-[#EFFFC4] dark:bg-[#142312] text-[#4D6600] dark:text-[#DFFF83]', icon: ShieldCheck },
  feed_logged: { category: 'inventory', tint: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300', icon: ClipboardList },
  feed_low: { category: 'inventory', tint: 'bg-[#EFFFC4] dark:bg-[#142312] text-[#4D6600] dark:text-[#DFFF83]', icon: Package, file: '/icon/chicken-rice.png' },
  feed_out: { category: 'inventory', tint: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300', icon: PackageX },
  logging_reminder: { category: 'reminders', tint: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300', icon: AlarmClock },
  report_ready: { category: 'system', tint: 'bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300', icon: FileText },
  system_update: { category: 'system', tint: 'bg-stone-100 dark:bg-[#252A2E] text-stone-700 dark:text-[#94A3B8]', icon: Settings, file: '/icon/icons8-settings-48.png' },
};

const FALLBACK = { category: 'system', tint: 'bg-stone-100 dark:bg-[#252A2E] text-stone-700 dark:text-[#94A3B8]', icon: Settings };

/** @returns {NotificationMeta} */
export function notificationMeta(type) {
  return NOTIFICATION_META[type] || FALLBACK;
}

/** Filter pills on the Notifications page, in display order. */
export const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'system', label: 'System' },
  { id: 'batches', label: 'Batches' },
  { id: 'health', label: 'Health' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'reminders', label: 'Reminders' },
];
