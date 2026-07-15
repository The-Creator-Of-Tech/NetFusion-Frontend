import TableSkeleton from "@/components/skeletons/TableSkeleton";

export default function Loading() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="h-5 w-16 rounded bg-surface-2 animate-pulse mb-1.5" />
          <div className="h-3 w-32 rounded bg-surface-2 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-lg bg-surface-2 animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-surface-2 animate-pulse" />
        </div>
      </div>
      {/* Search bar */}
      <div className="h-9 w-full rounded-lg bg-surface-2 animate-pulse mb-4" />
      {/* Table */}
      <TableSkeleton />
    </div>
  );
}
