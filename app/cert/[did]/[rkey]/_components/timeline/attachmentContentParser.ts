import { parseAtUri } from "./atUri";

export type AttachmentUriKind = "at-uri" | "http-url" | "other-uri";

export type ParsedAttachmentContent =
  | {
      kind: "uri";
      sourceType: "uri-definition";
      uri: string;
      uriKind: AttachmentUriKind;
    }
  | {
      kind: "blob";
      sourceType: "small-blob-definition" | "resolved-blob";
      uri: string | null;
      uriKind: AttachmentUriKind | null;
      name: string | null;
      mimeType: string | null;
      size: number | null;
      cid: string | null;
    }
  | { kind: "unknown"; sourceType: "unknown" };

type JsonRecord = Record<string, unknown>;

const TREE_DATASET_COLLECTION = "app.gainforest.dwc.dataset";

function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object";
}

function getStringField(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getNumberField(record: JsonRecord, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getUriKind(uri: string): AttachmentUriKind {
  if (uri.startsWith("at://")) return "at-uri";
  if (
    uri.startsWith("https://") ||
    uri.startsWith("http://") ||
    uri.startsWith("blob:") ||
    uri.startsWith("data:")
  ) {
    return "http-url";
  }
  return "other-uri";
}

function parseBlobRecord(
  blobRecord: JsonRecord,
  sourceType: "small-blob-definition" | "resolved-blob",
): ParsedAttachmentContent {
  const uri = getStringField(blobRecord, "uri");
  return {
    kind: "blob",
    sourceType,
    uri,
    uriKind: uri ? getUriKind(uri) : null,
    name: getStringField(blobRecord, "name"),
    mimeType: getStringField(blobRecord, "mimeType"),
    size: getNumberField(blobRecord, "size"),
    cid: getStringField(blobRecord, "cid"),
  };
}

function parseContentItem(item: unknown): ParsedAttachmentContent {
  if (!isJsonRecord(item)) return { kind: "unknown", sourceType: "unknown" };

  const itemType = getStringField(item, "$type");

  if (itemType === "org.hypercerts.defs#uri") {
    const uri = getStringField(item, "uri");
    if (!uri) return { kind: "unknown", sourceType: "unknown" };
    return {
      kind: "uri",
      sourceType: "uri-definition",
      uri,
      uriKind: getUriKind(uri),
    };
  }

  if (itemType === "org.hypercerts.defs#smallBlob") {
    const blobValue = item.blob;
    if (!isJsonRecord(blobValue)) return { kind: "unknown", sourceType: "unknown" };
    return parseBlobRecord(blobValue, "small-blob-definition");
  }

  if (itemType === "blob") {
    return parseBlobRecord(item, "resolved-blob");
  }

  return { kind: "unknown", sourceType: "unknown" };
}

export function parseAttachmentContent(content: unknown): ParsedAttachmentContent[] {
  if (content === null || content === undefined) return [];
  const inputItems = Array.isArray(content) ? content : [content];
  return inputItems.map((item) => parseContentItem(item));
}

export function getAtUrisFromContent(content: unknown): string[] {
  const seenUris = new Set<string>();
  const uris: string[] = [];

  for (const item of parseAttachmentContent(content)) {
    if (item.kind !== "uri" || item.uriKind !== "at-uri") continue;
    if (seenUris.has(item.uri)) continue;
    seenUris.add(item.uri);
    uris.push(item.uri);
  }

  return uris;
}

export function getLinkedTreeDatasetUrisFromContent(content: unknown): string[] {
  const linkedDatasetUris: string[] = [];
  const seenUris = new Set<string>();

  for (const item of parseAttachmentContent(content)) {
    if (
      item.kind !== "uri" ||
      item.uriKind !== "at-uri" ||
      parseAtUri(item.uri)?.collection !== TREE_DATASET_COLLECTION ||
      seenUris.has(item.uri)
    ) {
      continue;
    }

    seenUris.add(item.uri);
    linkedDatasetUris.push(item.uri);
  }

  return linkedDatasetUris;
}
