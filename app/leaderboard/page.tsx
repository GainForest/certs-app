import type { Metadata } from "next";
import { TrophyIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Leaderboard — Bumicerts",
  description: "A future leaderboard for highlighting top contributors and regenerative impact activity.",
  alternates: { canonical: "/leaderboard" },
};

export default function LeaderboardPage() {
  return (
    <section className="min-h-[calc(100vh-3.5rem)] px-6 pb-20 pt-10 sm:px-10 lg:px-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center rounded-[2rem] border border-border bg-card/70 px-6 py-20 text-center shadow-2xl shadow-black/5 backdrop-blur dark:shadow-black/20 sm:px-10">
        <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <TrophyIcon className="h-8 w-8" />
        </div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Leaderboard
        </p>
        <h1
          className="max-w-3xl text-4xl font-light leading-none tracking-[-0.035em] text-foreground sm:text-5xl md:text-6xl"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          Coming soon
        </h1>
        <p
          className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg"
          style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
        >
          We’ll use this space to celebrate leading contributors, organizations, and verified regenerative impact activity.
        </p>
      </div>
    </section>
  );
}
