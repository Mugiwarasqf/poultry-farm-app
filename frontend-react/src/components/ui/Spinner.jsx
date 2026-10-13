/**
 * Small spinning ring for buttons that are busy saving. Charcoal by default,
 * so it reads on the lime buttons; pass `light` on dark buttons.
 */
export function Spinner({ size = 16, light = false, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full border-2 animate-spin ${
        light ? 'border-white/30 border-t-white' : 'border-[#17191A]/20 border-t-[#17191A]'
      } ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export default Spinner;
