import type { TimelineAttachmentItem } from "@/app/_lib/indexer";
import { parseAttachmentContent } from "../../../shared/attachmentContentParser";
import { parseAtUri } from "../../../shared/atUri";

const CONTENT_TYPE_TREE_DATASET = "tree-dataset";
const CONTENT_TYPE_BIODIVERSITY = "biodiversity";
const CONTENT_TYPE_BIODIVERSITY_DATASET = "biodiversity-dataset";

export type TimelineReferenceLookupInput = {
  audioUris: string[];
  occurrenceUris: string[];
  datasetUris: string[];
  locationUris: string[];
};

export function getTimelineReferenceUrisForEntry(entry: TimelineAttachmentItem): string[] {
  const uris: string[] = [];
  const seen = new Set<string>();

  function addUri(uri: string | null | undefined) {
    if (!uri?.startsWith("at://") || seen.has(uri)) return;
    seen.add(uri);
    uris.push(uri);
  }

  for (const item of parseAttachmentContent(entry.record.content)) {
    if (item.kind === "uri") addUri(item.uri);
  }

  for (const subject of entry.record.subjects?.slice(1) ?? []) {
    addUri(subject.uri);
  }

  return uris;
}

function unique(values: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(values).filter((value) => value.length > 0)));
}

export function collectTimelineReferenceLookupInput(
  entries: readonly TimelineAttachmentItem[],
): TimelineReferenceLookupInput {
  const audioUris: string[] = [];
  const occurrenceUris: string[] = [];
  const datasetUris: string[] = [];
  const locationUris: string[] = [];

  for (const entry of entries) {
    for (const uri of getTimelineReferenceUrisForEntry(entry)) {
      const parsed = parseAtUri(uri);
      if (!parsed) continue;

      if (parsed.collection === "app.gainforest.ac.audio") audioUris.push(uri);
      if (parsed.collection === "app.gainforest.dwc.occurrence") occurrenceUris.push(uri);
      if (parsed.collection === "app.gainforest.dwc.dataset") datasetUris.push(uri);
      if (parsed.collection === "app.certified.location") locationUris.push(uri);
    }
  }

  return {
    audioUris: unique(audioUris),
    occurrenceUris: unique(occurrenceUris),
    datasetUris: unique(datasetUris),
    locationUris: unique(locationUris),
  };
}

export function getDatasetEvidencePurposes(entries: TimelineAttachmentItem[]): Map<string, "tree" | "biodiversity"> {
  const purposes = new Map<string, "tree" | "biodiversity">();
  for (const entry of entries) {
    const normalized = entry.record.contentType?.trim().toLowerCase();
    const purpose = normalized === CONTENT_TYPE_TREE_DATASET
      ? "tree"
      : normalized === CONTENT_TYPE_BIODIVERSITY || normalized === CONTENT_TYPE_BIODIVERSITY_DATASET
        ? "biodiversity"
        : null;
    if (!purpose) continue;

    for (const item of parseAttachmentContent(entry.record.content)) {
      if (item.kind !== "uri" || parseAtUri(item.uri)?.collection !== "app.gainforest.dwc.dataset") continue;
      if (purpose === "tree" || !purposes.has(item.uri)) purposes.set(item.uri, purpose);
    }
  }
  return purposes;
}
