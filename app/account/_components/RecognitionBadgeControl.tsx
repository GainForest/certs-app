"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AwardIcon, Loader2Icon, PlusIcon, UndoIcon } from "lucide-react";
import { formatCgsErrorMessage } from "@/app/_lib/cgs-errors";
import { RECOGNITION_BADGE_KEYS, type RecognitionBadgeKey } from "@/app/_lib/recognition-badges";
import { Button } from "@/components/ui/button";
import { RECOGNITION_BADGE_ICONS } from "./RecognitionBadges";

type Props = {
  did: string;
  accountName: string;
  initialAwarded: RecognitionBadgeKey[];
};

/**
 * GainForest stewards (any member of the admin group) award recognition badges
 * to an account from its profile — a grant award, or a BioBlitz win. Mirrors the
 * test-account flag flow, but these badges are shown on the public profile.
 */
export function RecognitionBadgeControl({ did, accountName, initialAwarded }: Props) {
  const t = useTranslations("common.recognition");
  const router = useRouter();
  const [awarded, setAwarded] = useState<Set<RecognitionBadgeKey>>(new Set(initialAwarded));
  const [busyKey, setBusyKey] = useState<RecognitionBadgeKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: RecognitionBadgeKey, next: boolean) {
    setBusyKey(key);
    setError(null);
    try {
      const response = await fetch("/api/internal/recognition", {
        method: next ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ did, badge: key }),
      });
      const data = (await response.json().catch(() => null)) as { awarded?: boolean; error?: string } | null;
      if (!response.ok || !data || data.error) {
        throw new Error(formatCgsErrorMessage(data?.error, t("genericError")));
      }
      setAwarded((current) => {
        const updated = new Set(current);
        if (next) updated.add(key);
        else updated.delete(key);
        return updated;
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("genericError"));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="mb-4 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
          <AwardIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("eyebrow")}</p>
          <h2 className="mt-1 font-medium text-foreground">{t("title")}</h2>
          <p className="mt-1 max-w-prose text-muted-foreground">{t("description", { name: accountName })}</p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {RECOGNITION_BADGE_KEYS.map((key) => {
          const Icon = RECOGNITION_BADGE_ICONS[key];
          const isAwarded = awarded.has(key);
          const busy = busyKey === key;
          return (
            <li
              key={key}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                isAwarded ? "border-primary/30 bg-primary/5" : "border-border bg-background"
              }`}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${
                    isAwarded ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{t(`badges.${key}.label`)}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{t(`badges.${key}.description`)}</p>
                </div>
              </div>
              {isAwarded ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void toggle(key, false)}
                  disabled={busy}
                  className="shrink-0 shadow-none"
                >
                  {busy ? <Loader2Icon className="size-4 animate-spin" /> : <UndoIcon className="size-4" />}
                  {t("remove")}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void toggle(key, true)}
                  disabled={busy}
                  className="shrink-0 shadow-none"
                >
                  {busy ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
                  {t("award")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p aria-live="polite" className="mt-3 text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
