"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { BinocularsIcon, DroneIcon, MicIcon, RulerIcon } from "lucide-react";
import { stripLocaleFromPathname } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import {
  accountAudioPath,
  accountDronePath,
  accountObservationsPath,
} from "../_lib/account-route";

type SubTabKey = "observations" | "measurements" | "audio" | "drone";

interface SubTab {
  labelKey: SubTabKey;
  href: string;
  icon: React.ElementType;
  /** Active only when the Observations route carries (or omits) ?layer=measurements. */
  layer?: "measurements" | null;
}

/**
 * Secondary navigation for the Observations surface. Observations, Audio and
 * Drone are field data, and Trees are just occurrences with measurements, so
 * they share one top-level "Observations" tab. "Measurements" is a layer of the
 * Observations route itself (?layer=measurements) rather than a separate page,
 * which is why it has no Trees tab of its own. The private layers
 * (Measurements/Audio/Drone) only appear to the account owner / organization
 * manager (`showPrivate`); public visitors just see the observations feed.
 */
export function ObservationsSubNav({ identifier, showPrivate }: { identifier: string; showPrivate: boolean }) {
  const t = useTranslations("common.accountTabs");
  const pathname = stripLocaleFromPathname(usePathname() ?? "/");
  const searchParams = useSearchParams();
  const observationsHref = accountObservationsPath(identifier);

  const tabs: SubTab[] = [
    { labelKey: "observations", href: observationsHref, icon: BinocularsIcon, layer: null },
    ...(showPrivate
      ? ([
          { labelKey: "measurements", href: `${observationsHref}?layer=measurements`, icon: RulerIcon, layer: "measurements" },
          { labelKey: "audio", href: accountAudioPath(identifier), icon: MicIcon },
          { labelKey: "drone", href: accountDronePath(identifier), icon: DroneIcon },
        ] satisfies SubTab[])
      : []),
  ];

  // Nothing to switch between when only the observations feed is available.
  if (tabs.length <= 1) return null;

  const onObservations = pathname === observationsHref || pathname.startsWith(`${observationsHref}/`);
  const activeLayer = searchParams.get("layer") === "measurements" ? "measurements" : null;

  function isActive(tab: SubTab): boolean {
    if (tab.layer !== undefined) {
      // Observations vs Measurements share the same route; the ?layer param decides.
      return onObservations && activeLayer === tab.layer;
    }
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  }

  return (
    <div className="mt-4 -mx-4 overflow-x-auto scrollbar-hidden px-4">
      <div className="flex min-w-max items-center gap-1.5">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.labelKey}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap select-none",
                active
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
