export default function TableSkeleton() {
  const rows = 5;
  const cols = 5;

  return (
    <div className="w-full rounded-xl border border-border overflow-hidden bg-surface">
      {/* Header row */}
      <div className="flex gap-3 px-4 py-3 border-b border-border bg-surface-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-surface-2 animate-pulse"
            style={{ flex: i === 0 ? 2 : 1 }}
          />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-3 px-4 py-3 border-b border-border last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-3 rounded bg-surface-2 animate-pulse"
              style={{ flex: colIdx === 0 ? 2 : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
