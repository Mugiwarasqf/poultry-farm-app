/**
 * Placeholder blocks shown while data loads, so a card never flashes "0"
 * before its real number arrives. Size and shape come from `className`.
 */
export function Skeleton({ className = '' }) {
  return <span aria-hidden="true" className={`block rounded-md bg-stone-200/70 animate-pulse ${className}`} />;
}

/** A few list-row placeholders: icon block, a title line and a detail line. */
export function SkeletonRows({ rows = 3 }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-stone-100">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className={`h-2.5 ${i % 2 ? 'w-1/2' : 'w-2/3'}`} />
          </div>
          <Skeleton className="h-3 w-14 shrink-0" />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
