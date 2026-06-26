import type {
  ManagedAudio,
  ManagedLocation,
  OccurrenceRecord,
  TimelineAttachmentItem,
  TimelineDatasetRecord,
  UploadTreeDatasetRecord,
} from "@/app/_lib/indexer";
import { formatDate } from "@/app/_lib/format";
import { greenGlobeTreePreviewHref } from "@/app/_lib/urls";
import { getTreeGroupStats } from "../../../shared/datasetStats";
import { parseAtUri } from "../../../shared/atUri";
import {
  getDatasetEvidencePurposes,
  getTimelineReferenceUrisForEntry,
} from "./referenceLookup";

export type TimelineReference = {
  id: string;
  kind: "audio" | "occurrence" | "tree" | "biodiversityDataset" | "location" | "unknown";
  title: string;
  description?: string;
  recordedAt?: string | null;
  dateRange?: string | null;
  treeGroupUri?: string | null;
  metrics?: { itemCount?: number; speciesCount?: number; treeCount?: number };
  mapHref?: string;
  actionHref?: string;
};

export type TimelineReferenceCopy = {
  linkedRecord: string;
  linkedAudioRecord: string;
  audioEvidence: string;
  linkedDataset: string;
  linkedTreeRecord: string;
  linkedSiteRecord: string;
  siteEvidence: string;
  linkedNatureData: string;
  treeCount: (count: number) => string;
  speciesCount: (count: number) => string;
  observationCount: (count: number) => string;
  individualCount: (count: number) => string;
};

function occurrenceTitle(item: OccurrenceRecord): string {
  return item.scientificName ?? item.vernacularName ?? item.remarks ?? "";
}

function greenGlobeTreePreview(did: string, treeGroupUri: string): string {
  return greenGlobeTreePreviewHref(did, { datasetRef: treeGroupUri });
}

function polygonsViewHref(locationUri: string): string {
  return `https://polygons-gainforest.vercel.app/view?${new URLSearchParams({ certifiedLocationRecordUri: locationUri }).toString()}`;
}

export function buildTimelineReferences(args: {
  entries: TimelineAttachmentItem[];
  audio: ManagedAudio[];
  occurrences: OccurrenceRecord[];
  treeGroups: Array<UploadTreeDatasetRecord | TimelineDatasetRecord>;
  places: ManagedLocation[];
  copy: TimelineReferenceCopy;
}): TimelineReference[] {
  const audioByUri = new Map(args.audio.map((item) => [item.metadata.uri, item]));
  const occurrenceByUri = new Map(args.occurrences.map((item) => [item.atUri, item]));
  const treeByUri = new Map(args.treeGroups.map((item) => {
    if ("record" in item) {
      return [item.metadata.uri, {
        uri: item.metadata.uri,
        name: item.record.name,
        description: item.record.description,
        recordCount: item.record.recordCount,
        createdAt: item.record.createdAt,
      }] as const;
    }
    return [item.uri, item] as const;
  }));
  const placeByUri = new Map(args.places.map((item) => [item.metadata.uri, item]));
  const datasetPurposes = getDatasetEvidencePurposes(args.entries);
  const uris = new Set<string>();

  for (const entry of args.entries) {
    for (const uri of getTimelineReferenceUrisForEntry(entry)) uris.add(uri);
  }

  return Array.from(uris).map((uri) => {
    const parsed = parseAtUri(uri);

    if (parsed?.collection === "app.gainforest.ac.audio") {
      const item = audioByUri.get(uri);
      return {
        id: uri,
        kind: "audio",
        title: item?.record.name ?? args.copy.linkedAudioRecord,
        description: formatDate(item?.record.recordedAt ?? item?.metadata.createdAt) || args.copy.audioEvidence,
        recordedAt: item?.record.recordedAt ?? item?.metadata.createdAt ?? null,
        actionHref: item?.record.audioUrl ?? undefined,
      } satisfies TimelineReference;
    }

    if (parsed?.collection === "app.gainforest.dwc.dataset") {
      const item = treeByUri.get(uri);
      const stats = getTreeGroupStats(uri, args.occurrences);
      const purpose = datasetPurposes.get(uri) ?? "tree";
      const title = item?.name ?? (purpose === "biodiversity" ? args.copy.linkedNatureData : args.copy.linkedDataset);
      const count = Math.max(stats.itemCount, item?.recordCount ?? 0);

      if (purpose === "biodiversity") {
        return {
          id: uri,
          kind: "biodiversityDataset",
          title,
          description: [
            args.copy.observationCount(count),
            stats.speciesCount > 0 ? args.copy.speciesCount(stats.speciesCount) : null,
          ].filter(Boolean).join(" · "),
          recordedAt: item?.createdAt ?? null,
          dateRange: stats.dateRange,
          treeGroupUri: uri,
          metrics: { itemCount: count, speciesCount: stats.speciesCount },
        } satisfies TimelineReference;
      }

      return {
        id: uri,
        kind: "tree",
        title,
        description: [
          args.copy.treeCount(count),
          stats.speciesCount > 0 ? args.copy.speciesCount(stats.speciesCount) : null,
        ].filter(Boolean).join(" · "),
        recordedAt: item?.createdAt ?? null,
        dateRange: stats.dateRange,
        treeGroupUri: uri,
        metrics: { itemCount: count, treeCount: count, speciesCount: stats.speciesCount },
        mapHref: greenGlobeTreePreview(parsed.did, uri),
        actionHref: greenGlobeTreePreview(parsed.did, uri),
      } satisfies TimelineReference;
    }

    if (parsed?.collection === "app.gainforest.dwc.occurrence") {
      const item = occurrenceByUri.get(uri);
      return {
        id: uri,
        kind: "occurrence",
        title: item ? occurrenceTitle(item) || args.copy.linkedTreeRecord : args.copy.linkedTreeRecord,
        description: [
          item?.individualCount ? args.copy.individualCount(item.individualCount) : null,
          formatDate(item?.eventDate ?? item?.createdAt),
        ].filter(Boolean).join(" · "),
        recordedAt: item?.eventDate ?? item?.createdAt ?? null,
        treeGroupUri: item?.datasetRef ?? null,
      } satisfies TimelineReference;
    }

    if (parsed?.collection === "app.certified.location") {
      const item = placeByUri.get(uri);
      return {
        id: uri,
        kind: "location",
        title: item?.record.name ?? args.copy.linkedSiteRecord,
        description: item?.record.locationType ?? args.copy.siteEvidence,
        actionHref: polygonsViewHref(uri),
      } satisfies TimelineReference;
    }

    return { id: uri, kind: "unknown", title: args.copy.linkedRecord } satisfies TimelineReference;
  });
}
