import Container from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export function AudioSkeleton() {
  return (
    <Container className="pt-4 pb-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Toolbar: search + view toggle + add button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Skeleton className="h-9 w-full sm:max-w-xs sm:flex-1" />
        <Skeleton className="h-9 w-[72px] rounded-lg" />
        <Skeleton className="h-8 w-36 rounded-full" />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border overflow-hidden bg-background"
          >
            {/* Audio player strip */}
            <div className="p-3 border-b border-border">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            {/* Body */}
            <div className="px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
              </div>
              <Skeleton className="mt-2 h-4 w-full" />
              <div className="flex items-center justify-between mt-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
