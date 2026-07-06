/**
 * Server-side helpers for the equipment registry.
 *
 * - `hasAnyEquipment` decides whether a personal profile shows the Equipment
 *   tab to visitors (owners always see it). One cheap, cached PDS read.
 * - `listGroupMemberDids` resolves an organization's full team so the org
 *   profile's Equipment tab can aggregate every member's gear. It reads
 *   through the group service with the viewer's session cookie, so it only
 *   works for people who belong to the organization.
 */

import { cache } from "react";
import { headers } from "next/headers";
import { EQUIPMENT_COLLECTION } from "./equipment";
import { resolvePdsHost } from "./pds";
import { fetchCgsMembersWithCookie } from "./cgs-server";

/** True when the repo holds at least one equipment record. Cached per render
 *  (react cache) and across requests for a few minutes (fetch revalidate). */
export const hasAnyEquipment = cache(async (did: string): Promise<boolean> => {
  const host = await resolvePdsHost(did).catch(() => null);
  if (!host) return false;
  const params = new URLSearchParams({
    repo: did,
    collection: EQUIPMENT_COLLECTION,
    limit: "1",
  });
  const res = await fetch(
    `https://${host}/xrpc/com.atproto.repo.listRecords?${params.toString()}`,
    { next: { revalidate: 300 } },
  ).catch(() => null);
  if (!res?.ok) return false;
  const data = (await res.json().catch(() => null)) as { records?: unknown } | null;
  return Array.isArray(data?.records) && data.records.length > 0;
});

/** Every member DID of a group, paging the group service until exhausted.
 *  Throws when the viewer's session may not read the member list. */
export async function listGroupMemberDids(groupDid: string): Promise<string[]> {
  const headerList = await headers();
  const cookie = headerList.get("cookie");

  const dids: string[] = [];
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  do {
    const page = await fetchCgsMembersWithCookie({ repo: groupDid, cookie, cursor, limit: 100 });
    for (const member of page.members) dids.push(member.did);
    const next = page.cursor ?? null;
    // Guard against a service echoing the same cursor forever.
    if (!next || seenCursors.has(next)) break;
    seenCursors.add(next);
    cursor = next;
  } while (cursor);
  return [...new Set(dids)];
}
