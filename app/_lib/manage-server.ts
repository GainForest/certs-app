import { cache } from "react";
import { headers } from "next/headers";
import { fetchAuthSession } from "./auth-server";
import { getAuthBaseUrl } from "./auth";
import { getAccountRouteData, resolveIdentifierToDid } from "@/app/account/_lib/account-route";
import {
  groupManageTarget,
  personalManageTarget,
  type ManageTarget,
} from "@/lib/links";

type CgsGroupMembership = {
  groupDid: string;
  role: "owner" | "admin" | "member" | string;
  displayName?: string | null;
  avatarUrl?: string | null;
  handle?: string | null;
};

type CgsGroupsResponse = {
  groups?: CgsGroupMembership[];
};

function normalizeDid(value: string): string {
  let current = value.trim();
  for (let i = 0; i < 3; i++) {
    if (current.startsWith("did:")) return current;
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
}

function sameIdentifier(group: CgsGroupMembership, identifier: string, did: string): boolean {
  const normalized = normalizeDid(identifier);
  if (normalized.startsWith("did:")) return group.groupDid === normalized || did === normalized;
  return Boolean(group.handle && group.handle.toLowerCase() === normalized.toLowerCase());
}

export const fetchUserCgsGroups = cache(async (): Promise<CgsGroupMembership[]> => {
  const headerList = await headers();
  const cookie = headerList.get("cookie");
  if (!cookie) return [];

  const upstream = await fetch(new URL("/api/cgs/groups", getAuthBaseUrl()), {
    headers: { cookie },
    cache: "no-store",
  });
  if (!upstream.ok) return [];

  const payload = (await upstream.json().catch(() => null)) as CgsGroupsResponse | null;
  return Array.isArray(payload?.groups) ? payload.groups : [];
});

export async function resolvePersonalManageTarget(): Promise<ManageTarget | null> {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) return null;
  const account = await getAccountRouteData(session.did, session.did);
  return personalManageTarget({
    did: account.did,
    accountKind: account.kind,
    identifier: account.urlIdentifier,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
  });
}

export async function resolveGroupManageTarget(identifier: string): Promise<ManageTarget | null> {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) return null;

  const normalizedIdentifier = normalizeDid(identifier);
  const did = normalizedIdentifier.startsWith("did:")
    ? normalizedIdentifier
    : await resolveIdentifierToDid(normalizedIdentifier).catch(() => null);
  if (!did?.startsWith("did:")) return null;

  const groups = await fetchUserCgsGroups();
  const membership = groups.find((group) => group.groupDid === did || sameIdentifier(group, identifier, did));
  if (!membership) return null;

  const account = await getAccountRouteData(did, identifier).catch(() => null);
  if (!account) return null;

  return groupManageTarget({
    did,
    accountKind: account.kind,
    // Keep the dashboard anchored to the route segment that was requested.
    // ManageDashboardClient uses target.basePath to decide whether it should
    // render the hero; switching to a canonical handle here can make valid
    // aliases like /manage/groups/group render only the child overview.
    identifier: normalizedIdentifier || identifier || membership.handle?.trim() || account.handle || did,
    role: membership.role,
    displayName: account.displayName || membership.displayName || null,
    avatarUrl: account.avatarUrl || membership.avatarUrl || null,
  });
}

export async function resolveManageTargetFromRepo(repo: string | null): Promise<ManageTarget | null> {
  if (!repo) return resolvePersonalManageTarget();
  return resolveGroupManageTarget(repo);
}
