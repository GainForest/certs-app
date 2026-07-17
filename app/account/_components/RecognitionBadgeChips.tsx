"use client";

import { AwardIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import QuickTooltip from "@/components/ui/quick-tooltip";
import {
  compareRecognitionBadgeKeys,
  parseRecognitionBadgeKey,
} from "@/app/_lib/recognition-badges";
import { recognitionBadgeIcon } from "./RecognitionBadges";

/**
 * Read-only awards row shown on a public profile, styled like the "Trusted by"
 * pill: a quiet label followed by overlapping round emblems, one per award. A
 * profile can hold several BioBlitz wins at once, so BioBlitz emblems carry a
 * small round number and a tooltip naming the round and prize.
 */
export function RecognitionBadgeChips({ badges }: { badges: string[] }) {
  const t = useTranslations("common.recognition");
  if (badges.length === 0) return null;

  const sorted = [...badges].sort(compareRecognitionBadgeKeys);

  const labelFor = (key: string): string => {
    const parsed = parseRecognitionBadgeKey(key);
    if (parsed?.family === "manual") return t(`badges.${parsed.key}.label`);
    if (parsed?.family === "bioblitz") {
      const base = `badges.bioblitz-${parsed.prize}`;
      if (parsed.roundId === null) return t(`${base}.label`);
      const roundName =
        parsed.roundId === 1
          ? t("roundName.pilot")
          : t("roundName.numbered", { round: parsed.roundId });
      return t(`${base}.labelWithRound`, { roundName });
    }
    return key;
  };

  const names = sorted.map(labelFor).join(", ");

  return (
    <div className="mb-4">
      <span
        className="inline-flex min-w-0 items-center gap-2 overflow-hidden rounded-full bg-accent/50 p-1 pl-3 text-sm font-medium text-muted-foreground backdrop-blur-lg"
        aria-label={t("aria", { names })}
      >
        <AwardIcon className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="shrink-0 whitespace-nowrap leading-none">{t("awardsLabel")}</span>
        <span className="inline-flex shrink-0 items-center -space-x-1">
          {sorted.map((key) => {
            const Icon = recognitionBadgeIcon(key);
            const parsed = parseRecognitionBadgeKey(key);
            const roundId = parsed?.family === "bioblitz" ? parsed.roundId : null;
            return (
              <QuickTooltip key={key} content={labelFor(key)} asChild>
                <span className="relative grid h-8 w-8 place-items-center rounded-full bg-background shadow-sm ring-1 ring-border/70 transition hover:z-10 hover:ring-2 hover:ring-primary">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {roundId !== null ? (
                    <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-primary px-1 text-[9px] font-semibold leading-3 tabular-nums text-primary-foreground">
                      {roundId}
                    </span>
                  ) : null}
                </span>
              </QuickTooltip>
            );
          })}
        </span>
      </span>
    </div>
  );
}
