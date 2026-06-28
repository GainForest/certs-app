"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  BadgeCheckIcon,
  BinocularsIcon,
  Building2Icon,
  CalendarIcon,
  GlobeIcon,
  Loader2Icon,
  MapPinIcon,
  StampIcon,
  UserRoundIcon,
} from "lucide-react";
import type { AccountSummary } from "../_lib/indexer";
import { resolveAccountSummary, getCachedAccountSummary } from "../_lib/account-summary-client";
import { accountHref } from "../_lib/urls";
import { formatCompact, formatCountry } from "../_lib/format";
import { ResolvedAvatar } from "./ResolvedAvatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "loaded" | "error";

/**
 * Wraps an avatar or author name in the feed with a rich hover card that
 * surfaces a comprehensive snapshot of the account — identity, bio, location,
 * join date, and lifetime sighting + Cert counts — fetched lazily the first
 * time the card opens. When there's no resolvable account (anonymous rows),
 * the children render untouched.
 */
export function AccountHoverCard({
  did,
  name,
  avatarRef,
  children,
  triggerClassName,
}: {
  did: string | null | undefined;
  name?: string | null;
  avatarRef?: string | null;
  children: ReactNode;
  triggerClassName?: string;
}) {
  const [summary, setSummary] = useState<AccountSummary | null>(() =>
    did ? getCachedAccountSummary(did) ?? null : null,
  );
  const [status, setStatus] = useState<Status>(() =>
    did && getCachedAccountSummary(did) ? "loaded" : "idle",
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!did) return <>{children}</>;

  function handleOpenChange(open: boolean) {
    if (!open || !did) return;
    if (status === "loaded" || status === "loading") return;
    setStatus("loading");
    const controller = new AbortController();
    abortRef.current = controller;
    resolveAccountSummary(did, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data) {
          setSummary(data);
          setStatus("loaded");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
  }

  return (
    <HoverCard openDelay={250} closeDelay={120} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <span className={cn("cursor-pointer", triggerClassName)}>{children}</span>
      </HoverCardTrigger>
      <HoverCardContent>
        <AccountCardBody
          did={did}
          summary={summary}
          status={status}
          fallbackName={name}
          fallbackAvatarRef={avatarRef}
        />
      </HoverCardContent>
    </HoverCard>
  );
}

function AccountCardBody({
  did,
  summary,
  status,
  fallbackName,
  fallbackAvatarRef,
}: {
  did: string;
  summary: AccountSummary | null;
  status: Status;
  fallbackName?: string | null;
  fallbackAvatarRef?: string | null;
}) {
  const t = useTranslations("common.feed.profileCard");

  const displayName = summary?.displayName?.trim() || fallbackName?.trim() || t("unnamed");
  const isOrg = Boolean(summary?.hasCertifiedOrg);
  const bio = summary?.bio?.trim() || null;
  const country = summary?.country ? formatCountry(summary.country) : null;
  const since = formatSince(summary?.foundedDate ?? summary?.createdAt ?? null);
  const website = summary?.website?.trim() || null;
  const kindLabel = isOrg ? summary?.certOrgType?.trim() || t("organization") : t("member");

  return (
    <div className="flex flex-col gap-3">
      {/* Identity */}
      <Link
        href={accountHref(did)}
        className="group/header flex items-start gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ResolvedAvatar
          did={did}
          imageUrl={summary?.avatarUrl ?? null}
          avatarRef={summary?.avatarUrl ? null : fallbackAvatarRef}
          name={displayName}
          fallbackIcon={isOrg ? <Building2Icon className="size-5" /> : <UserRoundIcon className="size-5" />}
          className="size-12"
          sizes="48px"
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground group-hover/header:underline">
            <span className="truncate">{displayName}</span>
            {summary?.hasCertifiedProfile || isOrg ? (
              <BadgeCheckIcon className="size-3.5 shrink-0 text-primary" aria-label={t("verified")} />
            ) : null}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            {isOrg ? (
              <Building2Icon className="size-3 shrink-0" />
            ) : (
              <UserRoundIcon className="size-3 shrink-0" />
            )}
            <span className="truncate">{kindLabel}</span>
          </p>
        </div>
      </Link>

      {/* Bio */}
      {bio ? (
        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{bio}</p>
      ) : status === "loading" ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2Icon className="size-3 animate-spin" />
          {t("loading")}
        </p>
      ) : status === "error" ? (
        <p className="text-xs text-muted-foreground">{t("unavailable")}</p>
      ) : null}

      {/* Meta */}
      {(country || since) && (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {country ? (
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="size-3 shrink-0" />
              <span className="truncate">{country}</span>
            </span>
          ) : null}
          {since ? (
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="size-3 shrink-0" />
              <span className="truncate">{t("since", { date: since })}</span>
            </span>
          ) : null}
        </div>
      )}

      {/* Stats */}
      {summary && (summary.observationCount > 0 || summary.bumicertCount > 0) ? (
        <div className="grid grid-cols-2 gap-2">
          <Stat
            icon={<BinocularsIcon className="size-3.5" />}
            value={formatCompact(summary.observationCount)}
            label={t("sightings", { count: summary.observationCount })}
          />
          <Stat
            icon={<StampIcon className="size-3.5" />}
            value={formatCompact(summary.bumicertCount)}
            label={t("certs", { count: summary.bumicertCount })}
          />
        </div>
      ) : null}

      {/* Website */}
      {website ? (
        <a
          href={externalHref(website)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 truncate text-xs text-primary hover:underline"
        >
          <GlobeIcon className="size-3 shrink-0" />
          <span className="truncate">{formatWebsite(website)}</span>
        </a>
      ) : null}

      {/* View profile */}
      <Link
        href={accountHref(did)}
        className="mt-0.5 inline-flex w-full items-center justify-center rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t("viewProfile")}
      </Link>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-2.5 py-1.5">
      <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-foreground">
        <span className="text-primary/70">{icon}</span>
        {value}
      </span>
      <span className="truncate text-[11px] leading-none text-muted-foreground">{label}</span>
    </div>
  );
}

function formatSince(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function externalHref(url: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}
