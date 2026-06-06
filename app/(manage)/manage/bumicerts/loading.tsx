import { LeafIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManageBumicertsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6">
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_30rem]">
          <section className="relative overflow-hidden rounded-[1.6rem] border border-border/80 bg-card shadow-sm">
            <div className="relative min-h-[17.5rem] rounded-[1.55rem] bg-muted/40 px-6 py-8 sm:px-8 lg:px-9">
              <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-background/90 text-primary shadow-sm">
                <LeafIcon className="size-6" />
              </div>
              <Skeleton className="h-12 w-64" />
              <Skeleton className="mt-3 h-12 w-56" />
              <Skeleton className="mt-5 h-5 w-96 max-w-full" />
              <Skeleton className="mt-2 h-5 w-80 max-w-full" />
              <Skeleton className="mt-7 h-10 w-40 rounded-full" />
            </div>
          </section>
          <aside className="rounded-[1.6rem] border border-border/80 bg-card/75 p-7 shadow-sm">
            <Skeleton className="mb-8 size-12 rounded-full" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-4 h-5 w-full" />
            <Skeleton className="mt-2 h-5 w-[90%]" />
            <Skeleton className="mt-5 h-8 w-28 rounded-full" />
          </aside>
        </div>
        <section className="pt-2">
          <div className="flex items-end gap-8 border-b border-border/80 px-1">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-2xl" />)}
          </div>
        </section>
      </div>
    </div>
  );
}
