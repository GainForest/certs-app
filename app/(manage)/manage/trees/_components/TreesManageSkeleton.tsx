import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function TreesManageSkeleton() {
  return (
    <Container className="pt-4 pb-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-80 max-w-[70vw]" />
        </div>
        <Skeleton className="h-8 w-36 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-full sm:w-80" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="divide-y divide-border rounded-xl border border-border">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-2 p-4">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-80 max-w-full" />
          </div>
        ))}
      </div>
    </Container>
  );
}
