export default function Loading() {
  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="h-5 w-14 rounded bg-surface-2 animate-pulse mb-1.5" />
          <div className="h-3 w-48 rounded bg-surface-2 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-14 rounded bg-surface-2 animate-pulse" />
          <div className="h-9 w-16 rounded-lg bg-surface-2 animate-pulse" />
        </div>
      </div>
      {/* Editor card */}
      <div className="flex-1 bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
        {/* Toolbar skeleton */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-surface-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className={`h-6 rounded bg-surface animate-pulse ${i === 2 || i === 5 ? "w-px mx-0.5 bg-border" : "w-7"}`}
            />
          ))}
        </div>
        {/* Content area skeleton */}
        <div className="flex-1 px-6 py-5 space-y-3">
          <div className="h-5 w-1/3 rounded bg-surface-2 animate-pulse" />
          <div className="h-3 w-full rounded bg-surface-2 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-surface-2 animate-pulse" />
          <div className="h-3 w-4/6 rounded bg-surface-2 animate-pulse" />
          <div className="h-5 w-2/5 rounded bg-surface-2 animate-pulse mt-6" />
          <div className="h-3 w-full rounded bg-surface-2 animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-surface-2 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
