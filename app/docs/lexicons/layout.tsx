import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ExternalLinkIcon } from "lucide-react";
import { HelixMark } from "./_components/HelixMark";
import { SideNav, type NavGroup } from "./_components/SideNav";
import { GROUPS } from "./_lib/registry";
import { shortName } from "./_lib/types";

const GITHUB_URL = "https://github.com/GainForest";

export default async function LexiconsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("common.docs");

  const navGroups: NavGroup[] = GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    items: g.lexicons.map((l) => ({ id: l.id, name: shortName(l.id) })),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-baseline gap-x-3 gap-y-2 text-sm text-muted-foreground">
        <Link href="/docs/lexicons" className="inline-flex items-baseline gap-1.5 no-underline">
          <span className="self-center">
            <HelixMark />
          </span>
          <span className="font-serif text-lg font-bold tracking-tight text-foreground">GainForest</span>
          <span className="font-mono text-[12px] text-muted-foreground/70">lexicons</span>
        </Link>
        <div className="flex-1" />
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary no-underline hover:underline"
        >
          GitHub
          <ExternalLinkIcon className="h-3 w-3 opacity-60" />
        </a>
      </div>

      <div className="flex items-start gap-0 lg:gap-10">
        <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-[190px] shrink-0 overflow-y-auto pb-8 lg:block">
          <SideNav groups={navGroups} overviewLabel={t("overview")} ariaLabel={t("namespacesAria")} />
        </aside>

        <main className="min-w-0 max-w-3xl flex-1">{children}</main>
      </div>
    </div>
  );
}
