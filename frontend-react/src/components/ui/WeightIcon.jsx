export function WeightIcon({ size = 16, strokeWidth, className = '', style, ...props }) {
  return (
    <img
      src="/icon/weighing-scale.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, ...style }}
      {...props}
    />
  );
}

export default WeightIcon;
