import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function TreesManageSkeleton() {
  return (
    <Container className="pt-4 pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-80 max-w-[70vw]" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Toolbar: search + record count */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Skeleton className="h-9 w-full sm:max-w-sm sm:flex-1" />
        <Skeleton className="h-4 w-28 shrink-0" />
      </div>

      {/* List */}
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-start justify-between px-4 py-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="ml-2 h-7 w-7 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </Container>
  );
}
