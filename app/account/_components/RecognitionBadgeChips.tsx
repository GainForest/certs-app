"use client";

import { useTranslations } from "next-intl";
import type { RecognitionBadgeKey } from "@/app/_lib/recognition-badges";
import { RECOGNITION_BADGE_ICONS } from "./RecognitionBadges";

/** Read-only badges of honour shown on a public profile for every steward
 *  award the account holds. Rendered for all viewers. */
export function RecognitionBadgeChips({ badges }: { badges: RecognitionBadgeKey[] }) {
  const t = useTranslations("common.recognition");
  if (badges.length === 0) return null;

  return (
    <ul className="mb-4 flex flex-wrap gap-2" aria-label={t("chipsAria")}>
      {badges.map((key) => {
        const Icon = RECOGNITION_BADGE_ICONS[key];
        return (
          <li
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            title={t(`badges.${key}.description`)}
          >
            <Icon className="size-3.5" />
            {t(`badges.${key}.label`)}
          </li>
        );
      })}
    </ul>
  );
}
