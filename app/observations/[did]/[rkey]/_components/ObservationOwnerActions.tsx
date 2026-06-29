"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { OccurrenceRecord } from "@/app/_lib/indexer";
import type { AuthSession } from "@/app/_lib/auth";
import { fetchCgsGroups, type CgsGroupMembership } from "@/app/(manage)/manage/_lib/cgs";
import { RecordDrawer, canManageOccurrenceRecord } from "@/app/_components/RecordDrawer";

/**
 * Owner-only "Edit" affordance for the full sighting page. Mirrors the explorer
 * drawer's permission check, then opens that very drawer (which already carries
 * the edit form, Re-run AI and delete) so the page and the drawer stay in sync.
 * Renders nothing for visitors who can't manage the sighting.
 */
export function ObservationOwnerActions({
  record,
  fallbackHref,
}: {
  record: OccurrenceRecord;
  fallbackHref: string;
}) {
  const t = useTranslations("marketplace.recordDrawer");
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [memberships, setMemberships] = useState<CgsGroupMembership[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { session?: AuthSession } | null) => {
        if (!cancelled) setSession(payload?.session ?? { isLoggedIn: false });
      })
      .catch(() => {
        if (!cancelled) setSession({ isLoggedIn: false });
      });
    fetchCgsGroups()
      .then((payload) => {
        if (!cancelled) setMemberships(payload.groups);
      })
      .catch(() => {
        if (!cancelled) setMemberships([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!canManageOccurrenceRecord(record, session, memberships)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border-soft bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <PencilIcon className="h-3.5 w-3.5" aria-hidden />
        {t("actions.edit")}
      </button>
      {open ? (
        <RecordDrawer
          record={record}
          onClose={() => setOpen(false)}
          onRecordUpdated={() => router.refresh()}
          onRecordDeleted={() => router.replace(fallbackHref)}
        />
      ) : null}
    </>
  );
}
