"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { stripLocaleFromPathname } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { lexiconHref } from "../_lib/types";

export interface NavGroup {
  id: string;
  title: string;
  items: { id: string; name: string }[];
}

const BASE = "/docs/lexicons";

export function SideNav({
  groups,
  overviewLabel,
  ariaLabel,
}: {
  groups: NavGroup[];
  overviewLabel: string;
  ariaLabel: string;
}) {
  const pathname = stripLocaleFromPathname(usePathname() ?? BASE);
  const activeId = pathname.startsWith(`${BASE}/`)
    ? decodeURIComponent(pathname.slice(BASE.length + 1))
    : null;
  const overviewActive = pathname === BASE;

  return (
    <nav aria-label={ariaLabel} className="text-sm">
      <Link
        href={BASE}
        className={cn(
          "mb-4 block text-[13px] no-underline",
          overviewActive ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {overviewLabel}
      </Link>

      {groups.map((g) => (
        <div key={g.id} className="mb-4">
          <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground/60">
            {g.title}
          </div>
          {g.items.map((item) => {
            const active = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={lexiconHref(item.id)}
                className={cn(
                  "block border-l-2 pl-2 font-mono text-[12px] leading-[1.9] no-underline",
                  active
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
