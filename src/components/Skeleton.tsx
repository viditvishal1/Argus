/** Cache-backed loading placeholder — shimmer, not spinner (dark theme). */
export function Skeleton({
  className = "",
  rows = 1,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-8 w-full" />
      ))}
    </div>
  );
}
