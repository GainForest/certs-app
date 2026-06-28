"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BinocularsIcon, ChevronRightIcon, XIcon } from "lucide-react";

const SESSION_KEY = "bioblitz-banner-dismissed";

/**
 * Full-width promo strip pinned above the sidebar and main content. Tapping it
 * navigates straight to the BioBlitz challenge page. The trailing close control
 * dismisses the strip for the rest of the browser session.
 */
export function BioblitzPromoBanner() {
  const t = useTranslations("marketplace.bioblitz");
  const hasBannerCopy =
    t.has("banner.message") && t.has("banner.cta") && t.has("banner.dismiss");
  const [dismissed, setDismissed] = useState(false);

  // Restore the session dismissal (state alone survives client navigation; this
  // covers a full reload within the same tab session).
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") setDismissed(true);
    } catch {
      // Private windows can block storage; fall back to in-memory state.
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  }, []);

  if (dismissed || !hasBannerCopy) return null;

  return (
    <div className="relative shrink-0">
      {/* The strip itself — a link straight to the BioBlitz challenge. The
          message and CTA wrap onto separate lines on narrow screens, and the
          right padding always clears the absolutely-positioned dismiss control
          so centered text never slides underneath it. */}
      <Link
        href="/bioblitz"
        className="flex w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-1 bg-primary py-2.5 pl-4 pr-11 text-center text-primary-foreground transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground/40 sm:gap-x-3 sm:px-11"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <BinocularsIcon className="hidden size-4 shrink-0 sm:block" aria-hidden />
          <span className="text-[13px] font-medium leading-snug sm:text-sm">{t("banner.message")}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1 sm:text-xs">
          {t("banner.cta")}
          <ChevronRightIcon className="size-3.5" aria-hidden />
        </span>
      </Link>

      {/* Session dismissal — sits above the strip, never navigates. */}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("banner.dismiss")}
        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-primary-foreground/80 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground/40 sm:right-2 sm:size-7"
      >
        <XIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
