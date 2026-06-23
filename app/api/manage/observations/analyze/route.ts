import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);
const SCORER_DIR = path.resolve(process.cwd(), "../gainforest-scorer");
const SCORER_ENV_PATH = path.join(SCORER_DIR, ".env");
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_VERTEX_LOCATION = "us-central1";

type GeminiAnalysis = {
  scientificName?: string | null;
  vernacularName?: string | null;
  kingdom?: string | null;
  eventDate?: string | null;
  recordedBy?: string | null;
  decimalLatitude?: string | null;
  decimalLongitude?: string | null;
  country?: string | null;
  locality?: string | null;
  habitat?: string | null;
  occurrenceRemarks?: string | null;
  subjectPart?: string | null;
  caption?: string | null;
  confidence?: number | null;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
  token_uri?: string;
};

type GeminiAuth =
  | { kind: "api-key"; key: string; model: string }
  | { kind: "vertex"; accessToken: string; project: string; location: string; model: string };

let scorerEnvCache: Record<string, string> | null = null;
let vertexTokenCache: { key: string; accessToken: string; expiresAt: number } | null = null;

function jsonError(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function scorerEnv(): Record<string, string> {
  if (scorerEnvCache) return scorerEnvCache;
  try {
    scorerEnvCache = existsSync(SCORER_ENV_PATH) ? parseEnvFile(readFileSync(SCORER_ENV_PATH, "utf8")) : {};
  } catch {
    scorerEnvCache = {};
  }
  return scorerEnvCache;
}

function envValue(key: string): string | null {
  return process.env[key]?.trim() || scorerEnv()[key]?.trim() || null;
}

function geminiModel(): string {
  return (envValue("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL).replace(/^models\//, "");
}

function resolveCredentialsFile(): string | null {
  const raw = envValue("GOOGLE_APPLICATION_CREDENTIALS");
  const candidates: string[] = [];
  if (raw) {
    candidates.push(raw);
    if (!path.isAbsolute(raw)) candidates.push(path.resolve(process.cwd(), raw), path.resolve(SCORER_DIR, raw));
    const basename = path.basename(raw);
    if (basename) candidates.push(path.join(SCORER_DIR, "secrets", basename));
  }
  candidates.push(path.join(SCORER_DIR, "secrets", "gemini-service-account.json"));
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

async function vertexAccessToken(credentialsFile: string, serviceAccount: ServiceAccount): Promise<string> {
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Invalid Gemini service account credentials.");
  }
  const tokenUri = serviceAccount.token_uri || "https://oauth2.googleapis.com/token";
  const cacheKey = `${credentialsFile}:${serviceAccount.client_email}`;
  const now = Math.floor(Date.now() / 1000);
  if (vertexTokenCache?.key === cacheKey && vertexTokenCache.expiresAt - 60 > now) return vertexTokenCache.accessToken;

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(serviceAccount.private_key, "base64url")}`;

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string } | null;
  if (!response.ok || !data?.access_token) throw new Error(data?.error || "Could not get Gemini access token.");
  vertexTokenCache = { key: cacheKey, accessToken: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return data.access_token;
}

async function geminiAuth(): Promise<GeminiAuth | null> {
  const apiKey = envValue("GEMINI_API_KEY") || envValue("GOOGLE_GENERATIVE_AI_API_KEY") || envValue("GOOGLE_API_KEY");
  const model = geminiModel();
  if (apiKey) return { kind: "api-key", key: apiKey, model };

  const credentialsFile = resolveCredentialsFile();
  if (!credentialsFile) return null;
  const serviceAccount = JSON.parse(readFileSync(credentialsFile, "utf8")) as ServiceAccount;
  const project = envValue("GEMINI_VERTEX_PROJECT") || serviceAccount.project_id;
  if (!project) return null;
  const location = envValue("GEMINI_VERTEX_LOCATION") || DEFAULT_VERTEX_LOCATION;
  const accessToken = await vertexAccessToken(credentialsFile, serviceAccount);
  return { kind: "vertex", accessToken, project, location, model };
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeCoordinate(value: unknown): string | null {
  const raw = normalizeString(value);
  if (!raw) return null;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? String(numeric) : null;
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function normalizeSubjectPart(value: unknown): string {
  const raw = normalizeString(value)?.toLowerCase();
  if (!raw) return "wholeOrganism";
  if (["leaf", "leaves", "foliage"].includes(raw)) return "leaf";
  if (["flower", "flowers", "bloom", "blossom"].includes(raw)) return "flower";
  if (["fruit", "fruits"].includes(raw)) return "fruit";
  if (["bark", "trunk", "stem"].includes(raw)) return raw === "bark" ? "bark" : "stem";
  if (["seed", "seeds"].includes(raw)) return "seed";
  if (["animal", "bird", "insect", "fungus", "plant", "whole", "whole organism", "wholeorganism"].includes(raw)) return "wholeOrganism";
  return raw.replace(/\s+/g, "-").slice(0, 64);
}

function normalizeAnalysis(value: unknown): GeminiAnalysis {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    scientificName: normalizeString(record.scientificName) ?? "Unidentified organism",
    vernacularName: normalizeString(record.vernacularName),
    kingdom: normalizeString(record.kingdom) ?? "Plantae",
    eventDate: normalizeString(record.eventDate),
    recordedBy: normalizeString(record.recordedBy),
    decimalLatitude: normalizeCoordinate(record.decimalLatitude),
    decimalLongitude: normalizeCoordinate(record.decimalLongitude),
    country: normalizeString(record.country),
    locality: normalizeString(record.locality),
    habitat: normalizeString(record.habitat),
    occurrenceRemarks: normalizeString(record.occurrenceRemarks),
    subjectPart: normalizeSubjectPart(record.subjectPart),
    caption: normalizeString(record.caption),
    confidence: normalizeConfidence(record.confidence),
  };
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found.");
    return JSON.parse(match[0]);
  }
}

async function callGemini(auth: GeminiAuth, prompt: string, mimeType: string, imageBytes: Buffer): Promise<Response> {
  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBytes.toString("base64") } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  if (auth.kind === "vertex") {
    return fetch(
      `https://${auth.location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(auth.project)}/locations/${encodeURIComponent(auth.location)}/publishers/google/models/${encodeURIComponent(auth.model)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${auth.accessToken}` },
        body,
        cache: "no-store",
      },
    );
  }

  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(auth.model)}:generateContent?key=${encodeURIComponent(auth.key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    },
  );
}

export async function POST(request: Request) {
  const auth = await geminiAuth().catch(() => null);
  if (!auth) return jsonError("not_configured", 503);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");
  if (!(file instanceof File)) return jsonError("missing_image", 400);

  const mimeType = file.type.split(";")[0]?.toLowerCase() ?? "";
  if (!ACCEPTED_IMAGE_TYPES.has(mimeType)) return jsonError("unsupported_image", 400);
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return jsonError("image_too_large", 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  const prompt = `Analyze this field observation photo and return only JSON. Fill fields for a biodiversity observation record. If a value is not visible, use null, except scientificName should be "Unidentified organism" when uncertain and eventDate may be null. Use ISO dates when possible. Coordinates must be decimal strings if visible in metadata or image context. Choose subjectPart like wholeOrganism, leaf, flower, fruit, bark, stem, seed, animal, fungus. Include a short caption and occurrenceRemarks that explain what is visible. Return keys: scientificName, vernacularName, kingdom, eventDate, recordedBy, decimalLatitude, decimalLongitude, country, locality, habitat, occurrenceRemarks, subjectPart, caption, confidence.`;

  const response = await callGemini(auth, prompt, mimeType, bytes);
  const data = (await response.json().catch(() => null)) as GeminiResponse | null;
  if (!response.ok || data?.error) return jsonError("analysis_failed", 502);

  const text = data?.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text;
  if (!text) return jsonError("analysis_failed", 502);

  try {
    return NextResponse.json({ analysis: normalizeAnalysis(extractJson(text)) });
  } catch {
    return jsonError("analysis_failed", 502);
  }
}
