import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Tainá agent runtime client.
 *
 * Tainá (../agent-village) is GainForest's Telegram-first field assistant: a
 * person connects their own Telegram bot (made with @BotFather), chats with
 * Tainá about what they see in nature, and Tainá records Darwin Core
 * observations under their account. The bots run inside an always-on Flue
 * runtime; this module is the only place bumicerts talks to it.
 *
 * All calls are server-side and authenticated with a shared secret, so the
 * browser can never reach the runtime directly. Who is provisioning always
 * comes from the bumicerts auth session — never from a request body.
 */

const DEV_FLUE_BASE_URL = "http://127.0.0.1:3583";
const DEV_PROVISION_SECRET = "dev-secret-change-me";

function flueBaseUrl(): string {
  return (
    process.env.TAINA_FLUE_BASE_URL?.trim() ||
    process.env.FLUE_BASE_URL?.trim() ||
    DEV_FLUE_BASE_URL
  ).replace(/\/$/, "");
}

function provisionSecret(): string {
  return (
    process.env.TAINA_PROVISION_SHARED_SECRET?.trim() ||
    process.env.PROVISION_SHARED_SECRET?.trim() ||
    DEV_PROVISION_SECRET
  );
}

async function flueRequest<T>(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: T }> {
  const response = await fetch(`${flueBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-provision-secret": provisionSecret(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
    // Fail fast rather than hang a serverless invocation.
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok, status: response.status, data };
}

/* ------------------------------- KV / PATs ------------------------------- */

// The Flue runtime exposes a small KV store (`/kv`) that the Tainá web app
// also uses. Personal access tokens live there under `pat:<token> → did`, so a
// key minted here resolves in the agent's publish path too.
async function kvCall(op: "get" | "set" | "del", key: string, value?: string): Promise<string | null> {
  const { ok, data } = await flueRequest<{ value?: string | null }>("/kv", { op, key, value });
  if (!ok) throw new Error(`taina kv ${op} failed`);
  return data.value ?? null;
}

export const TAINA_PAT_PREFIX = "taina_pat_";

/**
 * Mint a personal access token for a DID. The Telegram bot presents it as a
 * Bearer key to record observations under that account — the user's own
 * credentials never leave their sign-in.
 */
export async function mintTainaPat(did: string): Promise<string> {
  const token = TAINA_PAT_PREFIX + randomBytes(24).toString("base64url");
  await kvCall("set", `pat:${token}`, did);
  return token;
}

export async function resolveTainaPat(token: string): Promise<string | null> {
  if (!token.startsWith(TAINA_PAT_PREFIX)) return null;
  return kvCall("get", `pat:${token}`);
}

export async function deleteTainaPat(token: string): Promise<void> {
  await kvCall("del", `pat:${token}`);
}

/* ------------------------------ Runtime calls ---------------------------- */

export type TainaProvisionResult = {
  agentId?: string;
  botUrl?: string;
  botUsername?: string;
  activationCode?: string;
  activateUrl?: string;
  error?: string;
};

export async function provisionTainaBot(input: {
  did: string;
  handle: string;
  botToken: string;
  focus: string;
  pat: string;
}): Promise<{ ok: boolean; status: number; data: TainaProvisionResult }> {
  return flueRequest<TainaProvisionResult>("/provision", input);
}

export type TainaChatMessage = { role: "user" | "assistant"; text: string; ts: string };

export type TainaDashboardData = {
  provisioned: boolean;
  bot: string | null;
  botUrl: string | null;
  focus: string | null;
  apiKey: string | null;
  provisionedAt: string | null;
  activated?: boolean;
  activationCode?: string | null;
  activateUrl?: string | null;
  hasChat: boolean;
  messages: TainaChatMessage[];
  error?: string;
};

export async function fetchTainaDashboard(did: string): Promise<{ ok: boolean; status: number; data: TainaDashboardData }> {
  return flueRequest<TainaDashboardData>("/dashboard", { did });
}

/** Tell the runtime which key the bot should publish with (or clear it). */
export async function setTainaKey(did: string, pat: string | null): Promise<void> {
  await flueRequest("/key", { did, pat });
}
