import Container from "@/components/ui/container";
import { BumicertCardSkeleton } from "@/components/bumicert/BumicertCard";
import { Skeleton } from "@/components/ui/skeleton";

// Catches the account *layout* suspense (account/[did]/layout.tsx awaits
// getAccountRouteData for the hero + tab bar). That fetch bubbles past the
// page-level account/[did]/loading.tsx up to this boundary, so this mirrors the
// full account shell — hero, tabs, and content — instead of the generic root
// skeleton. Once the layout resolves, account/[did]/loading.tsx takes over for
// the page content during tab navigation.
export default function AccountSectionLoading() {
  return (
    <main className="w-full">
      <Container className="pt-4 pb-8">
        {/* Hero — mirrors AccountHero */}
        <section className="relative flex min-h-[260px] flex-col overflow-hidden rounded-t-4xl border-t border-border md:min-h-[320px]">
          <Skeleton className="absolute inset-0 z-0 rounded-none" />
          <div className="relative z-10 flex flex-1 flex-col justify-end px-5 pb-6 pt-24">
            <div className="mb-3 flex flex-col items-start gap-3 md:flex-row md:items-center">
              <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
              <div className="w-full min-w-0 max-w-3xl space-y-2">
                <Skeleton className="h-10 w-64 max-w-full" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
          </div>
        </section>

        {/* Tab bar — mirrors AccountTabBar */}
        <div className="mt-3">
          <div className="flex items-end gap-1 border-b border-border">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="px-3 py-2.5">
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Content — mirrors AccountContentColumns */}
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <section className="py-6">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-stretch gap-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <BumicertCardSkeleton key={index} />
                ))}
              </div>
            </section>
          </div>

          <aside className="py-6 lg:sticky lg:top-4 lg:w-80 lg:shrink-0 lg:self-start xl:w-[22rem]">
            <div className="space-y-5">
              {/* Stats card */}
              <section className="overflow-hidden rounded-3xl border border-border bg-card/90 shadow-sm backdrop-blur-sm">
                <div className="grid grid-cols-2 divide-x divide-border/70">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="p-4 sm:p-5">
                      <Skeleton className="mb-3 size-8 rounded-2xl sm:size-9" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-2 h-7 w-12 sm:h-8" />
                    </div>
                  ))}
                </div>
              </section>

              {/* Achievements card */}
              <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur-sm">
                <div className="mb-5 flex items-center gap-3">
                  <Skeleton className="size-5 rounded-md" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Skeleton className="size-11 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
                <Skeleton className="mx-auto mt-6 h-4 w-40" />
              </section>

              {/* Invite card */}
              <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur-sm">
                <div className="max-w-[13rem] space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-5 rounded-md" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-8 w-32 rounded-md" />
                </div>
              </section>
            </div>
          </aside>
        </div>
      </Container>
    </main>
  );
}
