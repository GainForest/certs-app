import { existsSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { cleanupCreatedPdsRecords } from "./support/pds";
import {
  listDisposableEmailMessages,
  disposableAccountMetadataPath,
  memberDisposableAccountMetadataPath,
  readDisposableAccountMetadataAt,
  waitForInboxDeletionToken,
  waitForInboxPasswordResetToken,
  writeDisposableAccountMetadataAt,
  type DisposableAccountMetadata,
  type DisposableInbox,
} from "./support/disposable-email";
import { groupIdentifier, patchCgsOrgMetadata, readCgsOrgMetadata, writeCgsOrgMetadata, type CgsOrgMetadata } from "./support/cgs-org";
import { getE2EEnv } from "./support/env";

const authStatePath = "e2e/.auth/user.json";
const memberAuthStatePath = "e2e/.auth/member.json";
const cleanupSmokeReportPath = "reports/e2e/cleanup-smoke.json";

type PdsSession = {
  did: string;
  accessJwt: string;
};

type CleanupAccount = {
  did: string;
  handle: string | null;
  email: string;
  inbox: DisposableInbox;
  serviceEndpoint: string;
  password?: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function now(): string {
  return new Date().toISOString();
}

function makeTemporaryPassword(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}-Aa1!`;
}

function normalizeEndpoint(endpoint: string | null | undefined): string {
  const env = getE2EEnv();
  const fallback = env.testPdsDomain
    ? env.testPdsDomain.startsWith("http") ? env.testPdsDomain : `https://${env.testPdsDomain}`
    : "https://dev.certified.app";
  return (endpoint || fallback).replace(/\/$/, "");
}

function disposableServiceEndpoint(metadata: DisposableAccountMetadata): string {
  return normalizeEndpoint(metadata.serviceEndpoint);
}

async function fetchText(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; text: string; body: unknown }> {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) as unknown : null;
  } catch {
    body = text;
  }
  return { ok: response.ok, status: response.status, text, body };
}

async function xrpcEndpoint(endpoint: string, method: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetchText(`${normalizeEndpoint(endpoint)}/xrpc/${method}`, init);
  if (!response.ok) {
    const message = isObject(response.body) && typeof response.body.message === "string"
      ? response.body.message
      : isObject(response.body) && typeof response.body.error === "string"
        ? response.body.error
        : response.text || `${response.status}`;
    throw new Error(`${method} failed: ${message}`);
  }
  return response.body;
}

async function xrpcMetadata(metadata: DisposableAccountMetadata, method: string, init: RequestInit = {}): Promise<unknown> {
  return xrpcEndpoint(disposableServiceEndpoint(metadata), method, init);
}

async function requestPasswordReset(account: CleanupAccount): Promise<void> {
  await xrpcEndpoint(account.serviceEndpoint, "com.atproto.server.requestPasswordReset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: account.email }),
  });
}

async function resetPassword(account: CleanupAccount, token: string, password: string): Promise<void> {
  await xrpcEndpoint(account.serviceEndpoint, "com.atproto.server.resetPassword", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
}

async function createSessionWithIdentifier(account: CleanupAccount, identifier: string, password: string): Promise<PdsSession> {
  const value = await xrpcEndpoint(account.serviceEndpoint, "com.atproto.server.createSession", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  if (!isObject(value) || typeof value.did !== "string" || typeof value.accessJwt !== "string") {
    throw new Error("PDS session response had an unexpected shape.");
  }

  return { did: value.did, accessJwt: value.accessJwt };
}

async function requestAccountDelete(account: CleanupAccount, session: PdsSession): Promise<void> {
  await xrpcEndpoint(account.serviceEndpoint, "com.atproto.server.requestAccountDelete", {
    method: "POST",
    headers: { authorization: `Bearer ${session.accessJwt}` },
  });
}

async function deleteAccount(account: CleanupAccount, session: PdsSession, password: string, token: string): Promise<void> {
  if (session.did !== account.did) {
    throw new Error(`Refusing to delete ${session.did}; expected ${account.did}.`);
  }

  await xrpcEndpoint(account.serviceEndpoint, "com.atproto.server.deleteAccount", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ did: session.did, password, token }),
  });
}

async function canCreateSession(account: CleanupAccount, identifier: string, password: string): Promise<boolean> {
  try {
    await createSessionWithIdentifier(account, identifier, password);
    return true;
  } catch {
    return false;
  }
}

async function repoExists(account: CleanupAccount): Promise<boolean> {
  const params = new URLSearchParams({ repo: account.did });
  const response = await fetch(`${account.serviceEndpoint}/xrpc/com.atproto.repo.describeRepo?${params.toString()}`).catch(() => null);
  return Boolean(response?.ok);
}

async function handleStillPointsToAccount(account: CleanupAccount): Promise<boolean> {
  if (!account.handle) return false;
  const params = new URLSearchParams({ handle: account.handle });
  const response = await fetch(`${account.serviceEndpoint}/xrpc/com.atproto.identity.resolveHandle?${params.toString()}`).catch(() => null);
  if (!response?.ok) return false;
  const body = await response.json().catch(() => null) as unknown;
  return isObject(body) && body.did === account.did;
}

async function verifyAccountGone(account: CleanupAccount, identifier: string, password: string | null | undefined, label: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  let latest = "";
  while (Date.now() <= deadline) {
    const sessionOk = password ? await canCreateSession(account, identifier, password) : false;
    const describeOk = await repoExists(account);
    const handleOk = await handleStillPointsToAccount(account);
    latest = `sessionOk=${sessionOk} describeOk=${describeOk} handleStillPointsHere=${handleOk}`;
    if (!sessionOk && !describeOk && !handleOk) {
      console.log(`[e2e] Verified ${label} PDS account is gone (${account.did}).`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(`Timed out verifying ${label} deletion for ${account.did}: ${latest}`);
}

async function establishPassword(
  account: CleanupAccount,
  label: string,
  onPatch: (patch: { password?: string; passwordResetToken?: string; cleanupError?: string | null }) => Promise<void>,
): Promise<string> {
  if (account.password) return account.password;

  const password = makeTemporaryPassword(`${label}Delete`);
  await onPatch({ password });
  const ignoredMessageIds = new Set((await listDisposableEmailMessages(account.inbox)).map((message) => message.id));
  await requestPasswordReset(account);
  const resetToken = await waitForInboxPasswordResetToken(account.inbox, ignoredMessageIds);
  await onPatch({ password, passwordResetToken: resetToken });
  await resetPassword(account, resetToken, password);
  return password;
}

function authCookieFromStorageState(path: string): string | null {
  if (!existsSync(path)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
  if (!isObject(parsed) || !Array.isArray(parsed.cookies)) return null;
  const cookies = parsed.cookies
    .filter((cookie): cookie is Record<string, unknown> => isObject(cookie) && typeof cookie.name === "string" && typeof cookie.value === "string")
    .map((cookie) => `${cookie.name}=${cookie.value}`);
  return cookies.length > 0 ? cookies.join("; ") : null;
}

async function destroyCgsOrganization(org: CgsOrgMetadata): Promise<void> {
  if (org.destroyedAt) return;
  const cookie = authCookieFromStorageState(authStatePath);
  if (!cookie) {
    console.log("[e2e] No owner auth cookie available for CGS destroy; continuing with PDS account deletion.");
    return;
  }

  const baseUrl = getE2EEnv().authBaseUrl;
  const response = await fetch(new URL("/api/cgs/mutation", baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ operation: "destroyGroup", repo: org.groupDid }),
  }).catch((error: unknown) => {
    console.log(`[e2e] CGS destroy request failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });

  if (!response) return;
  const text = await response.text().catch(() => "");
  if (response.ok || /unknown group|not found|already/i.test(text)) {
    await patchCgsOrgMetadata({ destroyedAt: now(), cleanupError: null });
    console.log(`[e2e] Destroyed CGS service state for ${org.groupDid}.`);
    return;
  }

  console.log(`[e2e] CGS destroy did not complete for ${org.groupDid}: ${response.status} ${text}`);
}

async function deleteCgsOrganizationAccount(): Promise<void> {
  const org = readCgsOrgMetadata();
  if (!org) {
    console.log("[e2e] No CGS organization metadata found; nothing to delete.");
    return;
  }

  try {
    await destroyCgsOrganization(org);
    const latest = readCgsOrgMetadata() ?? org;
    if (latest.verifiedGoneAt) return;

    const owner = readDisposableAccountMetadataAt(disposableAccountMetadataPath);
    const recoveryInbox = latest.recoveryInbox ?? owner?.inbox;
    const recoveryEmail = latest.recoveryEmail ?? owner?.email;
    if (!recoveryInbox || !recoveryEmail) throw new Error("Missing recovery inbox/email for CGS organization cleanup.");

    const account: CleanupAccount = {
      did: latest.groupDid,
      handle: latest.handle,
      email: recoveryEmail,
      inbox: recoveryInbox,
      serviceEndpoint: normalizeEndpoint(latest.serviceEndpoint ?? owner?.serviceEndpoint),
      password: latest.accountPassword,
    };
    const identifier = groupIdentifier(latest);
    const password = await establishPassword(account, "Group", async (patch) => {
      await patchCgsOrgMetadata({ accountPassword: patch.password ?? latest.accountPassword, passwordResetToken: patch.passwordResetToken ?? latest.passwordResetToken, cleanupError: null });
    });
    const session = await createSessionWithIdentifier(account, identifier, password);
    const ignoredMessageIds = new Set((await listDisposableEmailMessages(account.inbox)).map((message) => message.id));
    await requestAccountDelete(account, session);
    const deletionToken = await waitForInboxDeletionToken(account.inbox, ignoredMessageIds);
    await patchCgsOrgMetadata({ deletionToken, cleanupError: null });
    await deleteAccount(account, session, password, deletionToken);
    await patchCgsOrgMetadata({ accountPassword: password, deletedAt: now(), cleanupError: null });
    await verifyAccountGone(account, identifier, password, "CGS organization");
    await patchCgsOrgMetadata({ verifiedGoneAt: now(), cleanupError: null });
    console.log(`[e2e] Deleted CGS organization PDS account ${latest.groupDid}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await patchCgsOrgMetadata({ cleanupError: message });
    throw new Error(`Mandatory CGS organization cleanup failed: ${message}`);
  }
}

async function deleteDisposableAccountFromPath(metadataPath: string, authState: string, label: string): Promise<void> {
  const metadata = readDisposableAccountMetadataAt(metadataPath);
  if (!metadata) {
    console.log(`[e2e] No ${label} disposable account metadata found; nothing to delete.`);
    return;
  }

  if (!metadata.did) {
    console.log(`[e2e] ${label} disposable account ${metadata.email} never completed sign-in; keeping metadata and clearing browser state.`);
    await rm(authState, { force: true });
    return;
  }

  try {
    const account: CleanupAccount = {
      did: metadata.did,
      handle: metadata.handle,
      email: metadata.email,
      inbox: metadata.inbox,
      serviceEndpoint: disposableServiceEndpoint(metadata),
      password: metadata.password,
    };
    const password = await establishPassword(account, label, async (patch) => {
      await writeDisposableAccountMetadataAt(metadataPath, { ...metadata, password: patch.password ?? metadata.password, passwordResetToken: patch.passwordResetToken ?? metadata.passwordResetToken, cleanupError: null });
      Object.assign(metadata, patch, { cleanupError: null });
    });
    const ignoredMessageIds = new Set((await listDisposableEmailMessages(account.inbox)).map((message) => message.id));
    const session = await createSessionWithIdentifier(account, metadata.email, password);
    await requestAccountDelete(account, session);
    const deletionToken = await waitForInboxDeletionToken(account.inbox, ignoredMessageIds);
    await writeDisposableAccountMetadataAt(metadataPath, { ...metadata, password, deletionToken, cleanupError: null });
    await deleteAccount(account, session, password, deletionToken);
    await verifyAccountGone(account, metadata.email, password, label);
    await writeDisposableAccountMetadataAt(metadataPath, { ...metadata, password, deletionToken, deletedAt: now(), verifiedGoneAt: now(), cleanupError: null });
    await rm(authState, { force: true });
    console.log(`[e2e] Deleted ${label} disposable account ${metadata.did} (${metadata.email}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeDisposableAccountMetadataAt(metadataPath, { ...metadata, cleanupError: message });
    throw new Error(`Mandatory ${label} disposable account cleanup failed: ${message}`);
  }
}

async function globalTeardown(): Promise<void> {
  const result = await cleanupCreatedPdsRecords();
  console.log(
    `[e2e] Deleted ${result.deleted} test Cert record(s)${result.skipped ? `; disposable records are handled by account deletion (${result.skipped} tracked)` : ""}${result.failed ? `; ${result.failed} failed` : ""}.`,
  );

  const errors: string[] = [];
  for (const task of [
    () => deleteCgsOrganizationAccount(),
    () => deleteDisposableAccountFromPath(memberDisposableAccountMetadataPath, memberAuthStatePath, "member"),
    () => deleteDisposableAccountFromPath(disposableAccountMetadataPath, authStatePath, "owner"),
  ]) {
    try {
      await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[e2e] ${message}`);
      errors.push(message);
    }
  }

  const report = {
    createdAt: now(),
    ok: errors.length === 0,
    errors,
    cgsOrganization: readCgsOrgMetadata(),
    owner: readDisposableAccountMetadataAt(disposableAccountMetadataPath),
    member: readDisposableAccountMetadataAt(memberDisposableAccountMetadataPath),
  };
  await mkdir("reports/e2e", { recursive: true });
  await writeFile(cleanupSmokeReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`[e2e] Cleanup smoke report written to ${cleanupSmokeReportPath}.`);

  if (errors.length > 0) {
    throw new Error(`Mandatory E2E cleanup failed:\n- ${errors.join("\n- ")}`);
  }
}

export default globalTeardown;
