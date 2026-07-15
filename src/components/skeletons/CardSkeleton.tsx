export default function CardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-surface"
        >
          {/* Title bar */}
          <div className="h-4 w-2/3 rounded bg-surface-2 animate-pulse" />

          {/* Text line 1 */}
          <div className="h-3 w-full rounded bg-surface-2 animate-pulse" />

          {/* Text line 2 */}
          <div className="h-3 w-4/5 rounded bg-surface-2 animate-pulse" />

          {/* Footer bar */}
          <div className="mt-1 h-3 w-1/3 rounded bg-surface-2 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
