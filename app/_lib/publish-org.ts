import "server-only";
import { resolvePdsHost } from "./pds";
import { resolveInternalBadgeRepoDid } from "@/app/internal/badges/_lib/access";
import { BADGE_AWARD_COLLECTION, BADGE_DEFINITION_COLLECTION } from "@/app/internal/badges/_lib/badge-records";

/**
 * Self-serve "Publish" for organizations and personal accounts.
 *
 * The public explore pages only list accounts holding a featured badge —
 * an `app.certified.badge.award` signed by the GainForest org against its
 * "GainForest" badge definition (see `fetchFeaturedBadgeIndex`). Publishing
 * awards exactly that badge to the account, so everything it created (projects,
 * certs, observations, its org card) becomes visible on /projects,
 * /organizations, etc.
 *
 * The award must live in the GAINFOREST repo, which the publishing user is not
 * a member of — so the server writes it through the Certified Group Service
 * with an owner-issued API key (`GAINFOREST_CGS_API_KEY`, scope
 * `repo:app.certified.badge.award?action=create`). Per the CGS API-key rules
 * the target group travels on the querystring.
 */

/** The GainForest repo hosting the badge family (built-in trusted issuer). */
const FALLBACK_GAINFOREST_REPO_DID = "did:plc:yjck2sybksyigp3zvbq7bfki";
const PUBLISH_BADGE_TITLE = "gainforest";
const MAX_AWARD_PAGES = 40;

export class PublishOrgError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublishOrgError";
    this.status = status;
  }
}

function cgsBaseUrl(): string {
  return (process.env.GAINFOREST_CGS_URL?.trim() || "https://dev.groups.certified.app").replace(/\/$/, "");
}

function cgsApiKey(): string | null {
  return process.env.GAINFOREST_CGS_API_KEY?.trim() || null;
}

/** True when the server is configured to write publish awards. */
export function publishingConfigured(): boolean {
  return Boolean(cgsApiKey());
}

async function gainforestRepoDid(): Promise<string> {
  const configured = await resolveInternalBadgeRepoDid().catch(() => null);
  return configured ?? FALLBACK_GAINFOREST_REPO_DID;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type ListedRecord = { uri?: unknown; cid?: unknown; value?: unknown };
type ListRecordsResponse = { records?: ListedRecord[]; cursor?: unknown };

async function listRepoRecords(repoDid: string, collection: string, maxPages: number): Promise<ListedRecord[]> {
  const host = await resolvePdsHost(repoDid);
  if (!host) throw new PublishOrgError("The publishing service is unreachable right now. Please try again later.", 502);
  const entries: ListedRecord[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({ repo: repoDid, collection, limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const response = await fetch(`https://${host}/xrpc/com.atproto.repo.listRecords?${params.toString()}`, {
      cache: "no-store",
    }).catch(() => null);
    if (!response?.ok) break;
    const payload = (await response.json().catch(() => null)) as ListRecordsResponse | null;
    if (Array.isArray(payload?.records)) entries.push(...payload.records);
    cursor = str(payload?.cursor) ?? undefined;
    if (!cursor) break;
  }
  return entries;
}

/** The "GainForest" badge definition in the GainForest repo — the badge whose
 *  award makes an account featured on the explore pages. */
async function findPublishBadgeDefinition(repoDid: string): Promise<{ uri: string; cid: string }> {
  const definitions = await listRepoRecords(repoDid, BADGE_DEFINITION_COLLECTION, 5);
  for (const entry of definitions) {
    const uri = str(entry.uri);
    const cid = str(entry.cid);
    if (!uri || !cid || !isRecord(entry.value)) continue;
    if (str(entry.value.title)?.toLowerCase() === PUBLISH_BADGE_TITLE) return { uri, cid };
  }
  throw new PublishOrgError("Publishing isn’t available right now. Please try again later.", 503);
}

function awardSubjectDid(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const subject = value.subject;
  if (!isRecord(subject)) return null;
  return str(subject.did);
}

function awardBadgeUri(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const badge = value.badge;
  if (!isRecord(badge)) return null;
  return str(badge.uri);
}

/** True when the GainForest repo already carries a GainForest-badge award for
 *  this account (published, or manually endorsed with the same badge). */
export async function isPublished(subjectDid: string): Promise<boolean> {
  const repoDid = await gainforestRepoDid();
  const definition = await findPublishBadgeDefinition(repoDid);
  const awards = await listRepoRecords(repoDid, BADGE_AWARD_COLLECTION, MAX_AWARD_PAGES);
  return awards.some((entry) => awardBadgeUri(entry.value) === definition.uri && awardSubjectDid(entry.value) === subjectDid);
}

/** Award the GainForest badge to `subjectDid` through CGS. Idempotent: if the
 *  account already holds the badge, this is a no-op. */
export async function publishAccount(subjectDid: string): Promise<void> {
  const key = cgsApiKey();
  if (!key) throw new PublishOrgError("Publishing isn’t available right now. Please try again later.", 503);

  const repoDid = await gainforestRepoDid();
  const definition = await findPublishBadgeDefinition(repoDid);
  const awards = await listRepoRecords(repoDid, BADGE_AWARD_COLLECTION, MAX_AWARD_PAGES);
  const already = awards.some((entry) => awardBadgeUri(entry.value) === definition.uri && awardSubjectDid(entry.value) === subjectDid);
  if (already) return;

  // CGS API-key requests must carry the target group on the QUERYSTRING —
  // group resolution is a precondition of key auth (see the CGS docs). The
  // body repo must match it.
  const url = `${cgsBaseUrl()}/xrpc/app.certified.group.repo.createRecord?repo=${encodeURIComponent(repoDid)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({
      repo: repoDid,
      collection: BADGE_AWARD_COLLECTION,
      record: {
        $type: BADGE_AWARD_COLLECTION,
        badge: { uri: definition.uri, cid: definition.cid },
        subject: { $type: "app.certified.defs#did", did: subjectDid },
        note: "Published from the GainForest app",
        createdAt: new Date().toISOString(),
      },
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response) throw new PublishOrgError("The publishing service is unreachable right now. Please try again later.", 502);
  const payload = (await response.json().catch(() => null)) as { uri?: unknown; error?: unknown; message?: unknown } | null;
  if (!response.ok || !str(payload?.uri)) {
    console.warn("[publish-org] CGS award creation failed", {
      status: response.status,
      subjectDid,
      upstream: str(payload?.message) ?? str(payload?.error),
    });
    throw new PublishOrgError("Publishing didn’t go through. Please try again later.", 502);
  }
}
