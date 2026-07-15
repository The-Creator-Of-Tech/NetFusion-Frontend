import CardSkeleton from "@/components/skeletons/CardSkeleton";

export default function Loading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        {/* Header skeleton */}
        <div className="h-7 w-40 rounded bg-surface-2 animate-pulse mb-2" />
        <div className="h-4 w-64 rounded bg-surface-2 animate-pulse" />
      </div>
      <CardSkeleton />
    </div>
  );
}
