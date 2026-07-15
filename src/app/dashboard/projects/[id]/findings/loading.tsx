import TableSkeleton from "@/components/skeletons/TableSkeleton";

export default function Loading() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="h-5 w-20 rounded bg-surface-2 animate-pulse mb-1.5" />
          <div className="h-3 w-28 rounded bg-surface-2 animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-surface-2 animate-pulse" />
      </div>
      {/* Severity stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-2 animate-pulse border border-border" />
        ))}
      </div>
      {/* Filter pills */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-6 w-16 rounded-full bg-surface-2 animate-pulse" />
        ))}
      </div>
      {/* Table */}
      <TableSkeleton />
    </div>
  );
}
