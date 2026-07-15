export default function Loading() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="h-5 w-20 rounded bg-surface-2 animate-pulse mb-1.5" />
          <div className="h-3 w-32 rounded bg-surface-2 animate-pulse" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-surface-2 animate-pulse" />
      </div>
      {/* Filter pills */}
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-16 rounded-full bg-surface-2 animate-pulse" />
        ))}
      </div>
      {/* Timeline entries */}
      <div className="relative space-y-3">
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {/* Icon placeholder */}
            <div className="w-8 h-8 rounded-lg bg-surface-2 animate-pulse shrink-0 z-10" />
            {/* Card placeholder */}
            <div className="flex-1 h-[72px] rounded-xl bg-surface border border-border animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
