import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getE2EEnv } from "./env";

export const E2E_PDS_COLLECTIONS = {
  claimActivity: "org.hypercerts.claim.activity",
} as const;

export const createdRecordsPath = "e2e/.auth/created-records.jsonl";

export type PdsRepoRecord = {
  uri: string;
  cid: string;
  value: Record<string, unknown>;
};

type PdsSession = {
  did: string;
  accessJwt: string;
  serviceEndpoint: string;
};

type ParsedAtUri = {
  did: string;
  collection: string;
  rkey: string;
};

type ListedCreatedRecord = {
  uri: string;
  cid?: string;
  title?: string;
  collection?: string;
  createdAt: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPdsRepoRecord(value: unknown): value is PdsRepoRecord {
  return isObject(value) && typeof value.uri === "string" && typeof value.cid === "string" && isObject(value.value);
}

function isListRecordsResponse(value: unknown): value is { records: PdsRepoRecord[]; cursor?: string } {
  return isObject(value) && Array.isArray(value.records) && value.records.every(isPdsRepoRecord);
}

function pdsBaseUrl(): string {
  const domain = getE2EEnv().testPdsDomain;
  if (!domain) throw new Error("E2E_TEST_PDS_DOMAIN is required for direct PDS checks.");
  return domain.startsWith("http://") || domain.startsWith("https://") ? domain.replace(/\/$/, "") : `https://${domain}`;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text ? JSON.parse(text) as unknown : null;

  if (!response.ok) {
    const message = isObject(body) && typeof body.message === "string" ? body.message : `${response.status} ${response.statusText}`;
    throw new Error(`PDS request failed: ${message}`);
  }

  return body;
}

async function createPdsSession(): Promise<PdsSession> {
  const env = getE2EEnv();
  const serviceEndpoint = pdsBaseUrl();
  const session = await fetchJson(`${serviceEndpoint}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: env.testHandle, password: env.testPassword }),
  });

  if (!isObject(session) || typeof session.did !== "string" || typeof session.accessJwt !== "string") {
    throw new Error("Direct PDS sign-in did not return the expected session.");
  }

  return { did: session.did, accessJwt: session.accessJwt, serviceEndpoint };
}

export function parseAtUri(uri: string): ParsedAtUri {
  if (!uri.startsWith("at://")) throw new Error(`Expected AT URI, got ${uri}`);
  const [did, collection, rkey] = uri.slice("at://".length).split("/");
  if (!did || !collection || !rkey) throw new Error(`AT URI has unexpected format: ${uri}`);
  return { did, collection, rkey };
}

async function listPdsRecords(collection: string): Promise<PdsRepoRecord[]> {
  const session = await createPdsSession();
  const records: PdsRepoRecord[] = [];
  let cursor: string | undefined;

  do {
    const search = new URLSearchParams({ repo: session.did, collection, limit: "100" });
    if (cursor) search.set("cursor", cursor);

    const value = await fetchJson(`${session.serviceEndpoint}/xrpc/com.atproto.repo.listRecords?${search.toString()}`, {
      headers: { authorization: `Bearer ${session.accessJwt}` },
    });

    if (!isListRecordsResponse(value)) {
      throw new Error(`Direct PDS list response for ${collection} had an unexpected shape.`);
    }

    records.push(...value.records);
    cursor = value.cursor;
  } while (cursor);

  return records;
}

export async function getPdsRecord(uri: string): Promise<PdsRepoRecord> {
  const session = await createPdsSession();
  const parsed = parseAtUri(uri);
  if (parsed.did !== session.did) {
    throw new Error(`Refusing to read a record for ${parsed.did} while signed in as ${session.did}.`);
  }

  const search = new URLSearchParams({ repo: session.did, collection: parsed.collection, rkey: parsed.rkey });
  const value = await fetchJson(`${session.serviceEndpoint}/xrpc/com.atproto.repo.getRecord?${search.toString()}`, {
    headers: { authorization: `Bearer ${session.accessJwt}` },
  });

  if (!isPdsRepoRecord(value)) {
    throw new Error(`Direct PDS get response for ${uri} had an unexpected shape.`);
  }
  return value;
}

export async function waitForClaimActivityByTitle(title: string): Promise<PdsRepoRecord> {
  const deadline = Date.now() + 60_000;
  let latestCount = 0;

  while (Date.now() <= deadline) {
    const records = await listPdsRecords(E2E_PDS_COLLECTIONS.claimActivity);
    latestCount = records.length;
    const match = records.find((record) => record.value.title === title);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(`Timed out waiting for direct PDS record titled ${title}. Last count: ${latestCount}.`);
}

export function getRecordArray(record: PdsRepoRecord, key: string): Record<string, unknown>[] {
  const value = record.value[key];
  return Array.isArray(value) ? value.filter(isObject) : [];
}

export function trackCreatedPdsRecord(record: PdsRepoRecord): void {
  const parsed = parseAtUri(record.uri);
  const entry: ListedCreatedRecord = {
    uri: record.uri,
    cid: record.cid,
    collection: parsed.collection,
    title: typeof record.value.title === "string" ? record.value.title : undefined,
    createdAt: new Date().toISOString(),
  };
  mkdirSync(dirname(createdRecordsPath), { recursive: true });
  appendFileSync(createdRecordsPath, `${JSON.stringify(entry)}\n`);
}

function readTrackedCreatedRecords(): ListedCreatedRecord[] {
  if (!existsSync(createdRecordsPath)) return [];
  return readFileSync(createdRecordsPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ListedCreatedRecord)
    .filter((entry) => typeof entry.uri === "string");
}

async function deletePdsRecord(uri: string): Promise<void> {
  const session = await createPdsSession();
  const parsed = parseAtUri(uri);
  if (parsed.did !== session.did) {
    throw new Error(`Refusing to delete ${uri}; active test account is ${session.did}.`);
  }

  await fetchJson(`${session.serviceEndpoint}/xrpc/com.atproto.repo.deleteRecord`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.accessJwt}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ repo: session.did, collection: parsed.collection, rkey: parsed.rkey }),
  });
}

export async function cleanupCreatedPdsRecords(): Promise<{ deleted: number; failed: number }> {
  const tracked = readTrackedCreatedRecords();
  const uris = new Set(tracked.map((entry) => entry.uri));

  // Safety sweep for earlier interrupted local runs. Limit this to the test-only
  // Bumicert title prefix instead of wiping the account.
  const claimRecords = await listPdsRecords(E2E_PDS_COLLECTIONS.claimActivity).catch(() => []);
  for (const record of claimRecords) {
    if (typeof record.value.title === "string" && record.value.title.startsWith("E2E Bumicert ")) {
      uris.add(record.uri);
    }
  }

  let deleted = 0;
  let failed = 0;
  for (const uri of uris) {
    try {
      await deletePdsRecord(uri);
      deleted += 1;
    } catch (error) {
      failed += 1;
      console.log(`[e2e] Could not delete test record ${uri}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (deleted > 0 || tracked.length > 0) {
    mkdirSync(dirname(createdRecordsPath), { recursive: true });
    writeFileSync(createdRecordsPath, "");
  }

  return { deleted, failed };
}
