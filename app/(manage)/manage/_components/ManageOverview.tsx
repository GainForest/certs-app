"use client";

import { useTranslations } from "next-intl";
import type { AccountRouteData } from "@/app/account/_lib/account-route";
import { OverviewFolders, type OverviewFolderTile } from "@/app/account/_components/OverviewFolders";
import { manageHref, type ManageTarget } from "@/lib/links";

type OverviewStats = {
  bumicerts: number;
  donations: number;
  observations: number;
  projects?: number | null;
  sites?: number | null;
  trees?: number | null;
  audio?: number | null;
};

function buildTiles(account: AccountRouteData, stats: OverviewStats, target: ManageTarget): OverviewFolderTile[] {
  if (account.kind === "user") {
    // Personal accounts can own projects and collect observations without
    // creating an organization, so surface both folders on the personal home.
    return [
      { id: "projects", title: "Projects", href: manageHref(target, "projects"), count: stats.projects },
      { id: "observations", title: "Observations", href: manageHref(target, "observations"), count: stats.observations },
    ];
  }
  return [
    { id: "projects", title: "Projects", href: manageHref(target, "projects"), count: stats.projects },
    { id: "observations", title: "Observations", href: manageHref(target, "observations"), count: stats.observations },
    { id: "sites", title: "Sites", href: manageHref(target, "sites"), count: stats.sites },
    { id: "trees", title: "Trees", href: manageHref(target, "trees"), count: stats.trees },
    { id: "audio", title: "Audio", href: manageHref(target, "audio"), count: stats.audio },
  ];
}

export function ManageOverview({
  target,
  account,
  stats,
}: {
  target: ManageTarget;
  account: AccountRouteData;
  stats: OverviewStats;
}) {
  const t = useTranslations("common.sidebar.items");
  const tiles = buildTiles(account, stats, target);

  const titleOverrides: Record<string, string> = {
    observations: t("myObservations"),
    projects: t("projects"),
  };

  return (
    <OverviewFolders
      tiles={tiles.map((tile) => (titleOverrides[tile.id] ? { ...tile, title: titleOverrides[tile.id] } : tile))}
    />
  );
}
