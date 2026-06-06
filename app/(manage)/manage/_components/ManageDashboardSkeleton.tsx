import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function ManageDashboardSkeleton() {
  return (
    <Container className="pt-4 pb-8 space-y-6">
      <div className="relative min-h-[260px] overflow-hidden rounded-2xl border border-border md:min-h-[320px]">
        <Skeleton className="absolute inset-0 rounded-2xl" />
        <div className="relative z-10 flex flex-col justify-end px-5 pb-6 pt-24">
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-4 w-80 max-w-[60vw]" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>

      <div className="space-y-3 py-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[75%]" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    </Container>
  );
}
