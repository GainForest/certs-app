/**
 * Recognition badges a GainForest steward can award from an account's profile —
 * the same award mechanism as the hidden "test-account" flag, but these are
 * visible badges of honour shown on the recipient's public profile.
 *
 * The badge title is the stable key stored on the badge definition record; the
 * human-readable label + description are translated in the UI (keyed by this
 * key). Keep these keys in sync with the indexer award scan and the moderator
 * control.
 */

export const RECOGNITION_BADGE_KEYS = [
  "rewilding-grant",
  "bioblitz-most-images",
  "bioblitz-best-picture",
] as const;

export type RecognitionBadgeKey = (typeof RECOGNITION_BADGE_KEYS)[number];

export function isRecognitionBadgeKey(value: string): value is RecognitionBadgeKey {
  return (RECOGNITION_BADGE_KEYS as readonly string[]).includes(value);
}

/** Stored on the badge definition record (internal, not the user-facing label). */
export const RECOGNITION_BADGE_DESCRIPTIONS: Record<RecognitionBadgeKey, string> = {
  "rewilding-grant": "Recipient of a Rewilding the Web grant.",
  "bioblitz-most-images": "BioBlitz winner — most observations uploaded in a round.",
  "bioblitz-best-picture": "BioBlitz winner — best biodiversity picture of a round.",
};
