import { ImagesIcon, SproutIcon, TrophyIcon } from "lucide-react";
import type { RecognitionBadgeKey } from "@/app/_lib/recognition-badges";

export const RECOGNITION_BADGE_ICONS: Record<RecognitionBadgeKey, typeof SproutIcon> = {
  "rewilding-grant": SproutIcon,
  "bioblitz-most-images": ImagesIcon,
  "bioblitz-best-picture": TrophyIcon,
};
