import { notificationMeta } from '../../lib/notifications/meta';

const SIZES = {
  sm: { box: 'w-8 h-8', glyph: 15 },
  md: { box: 'w-10 h-10', glyph: 18 },
  lg: { box: 'w-11 h-11', glyph: 19 },
};

/**
 * Round icon for a notification: a soft tint per type, with an outline
 * glyph that is always black — colour lives in the circle, never the icon.
 * Uses the custom SVG from public/icons when one is set in lib/notifications/meta.js.
 */
export function NotificationIcon({ type, size = 'md' }) {
  const { tint, icon: Icon, file } = notificationMeta(type);
  const { box, glyph } = SIZES[size] || SIZES.md;

  return (
    <span className={`${box} ${tint} shrink-0 rounded-full flex items-center justify-center text-stone-900`} aria-hidden="true">
      {file ? (
        <img src={file} alt="" width={glyph} height={glyph} style={{ width: glyph, height: glyph }} className="object-contain" />
      ) : (
        <Icon size={glyph} strokeWidth={1.75} />
      )}
    </span>
  );
}
