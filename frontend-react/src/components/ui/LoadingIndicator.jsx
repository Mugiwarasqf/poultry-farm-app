/**
 * Ouroboros loading indicator: a green ring, outline only, whose head keeps
 * chasing its own tail. The stroke stretches almost all the way round until
 * the head nearly reaches the tail, then the tail slides after it, while the
 * whole ring keeps turning.
 *
 * Pure SVG + CSS (keyframes in styles/index.css) — no library. People who ask
 * for reduced motion see a still three-quarter ring instead.
 *
 * @param {Object} props
 * @param {number} [props.size]      Diameter in px.
 * @param {number} [props.stroke]    Line thickness in viewBox units (of 50).
 * @param {string} [props.label]     Screen-reader text.
 */
export function LoadingIndicator({ size = 48, stroke = 4, label = 'Loading' }) {
  return (
    <span role="progressbar" aria-label={label} className="inline-flex" style={{ width: size, height: size }}>
      <svg viewBox="0 0 50 50" width={size} height={size} aria-hidden="true" className="ouroboros">
        <circle
          className="ouroboros__snake"
          cx="25"
          cy="25"
          r="20"
          pathLength="100"
          fill="none"
          stroke="#B7DA3E"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export default LoadingIndicator;
