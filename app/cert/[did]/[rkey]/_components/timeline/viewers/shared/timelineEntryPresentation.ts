import { formatDate } from "@/app/_lib/format";
import type { TimelineEvidenceKind } from "../../shared/evidenceKind";
import { formatDateRangeFromValues } from "../../shared/timelineDates";
import type { TimelineEntryViewModel } from "../../shared/timelineViewModel";
import type { TimelineReference } from "./referenceResolution/timelineReferences";

export type EntryKindLabels = Record<TimelineEvidenceKind, string>;

export type MetricCopy = {
  treeCount: (count: number) => string;
  speciesCount: (count: number) => string;
  natureSightingCount: (count: number) => string;
  dataGroupCount: (count: number) => string;
  recordingCount: (count: number) => string;
  itemCount: (count: number) => string;
};

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

export function getTimelineEntryKindLabel(
  kind: TimelineEvidenceKind,
  labels: EntryKindLabels,
): string {
  return labels[kind] ?? labels.other;
}

export function getTimelineEntryTitle({
  entry,
  labels,
  natureFallback,
}: {
  entry: TimelineEntryViewModel;
  labels: EntryKindLabels;
  natureFallback: string;
}): string {
  const explicit = cleanText(entry.item.record.title);
  const treeRef = entry.refs.find((ref) => ref.kind === "tree");
  if (entry.kind === "tree" && treeRef) return treeRef.title;
  if (entry.kind === "nature") return explicit ?? natureFallback;
  return explicit ?? getTimelineEntryKindLabel(entry.kind, labels);
}

export function getTimelineEntryRecordedDate(
  kind: TimelineEvidenceKind,
  references: TimelineReference[],
  notSpecified: string,
): string {
  const referenceRange = references.find((ref) => ref.dateRange)?.dateRange;
  if (referenceRange) return referenceRange;

  const dates = references
    .map((ref) => ref.recordedAt)
    .filter((value): value is string => Boolean(value));
  const range = formatDateRangeFromValues(dates);
  if (range) return range;
  if (kind === "audio") return formatDate(dates[0]) || notSpecified;
  return notSpecified;
}

export function getTimelineEntryMetricBadges(
  kind: TimelineEvidenceKind,
  references: TimelineReference[],
  tileCount: number,
  copy: MetricCopy,
): string[] {
  if (kind === "tree") {
    const treeCount = references.reduce(
      (sum, ref) => sum + (ref.metrics?.treeCount ?? ref.metrics?.itemCount ?? 0),
      0,
    );
    const speciesCount = references.reduce(
      (sum, ref) => sum + (ref.metrics?.speciesCount ?? 0),
      0,
    );
    return [
      treeCount > 0 ? copy.treeCount(treeCount) : null,
      speciesCount > 0 ? copy.speciesCount(speciesCount) : null,
    ].filter((value): value is string => Boolean(value));
  }

  if (kind === "nature") {
    const sightings = references.filter((ref) => ref.kind === "occurrence");
    const datasets = references.filter((ref) => ref.kind === "biodiversityDataset");
    const datasetSightingCount = datasets.reduce(
      (sum, ref) => sum + (ref.metrics?.itemCount ?? 0),
      0,
    );
    const sightingCount = sightings.length + datasetSightingCount;
    const species = new Set(
      sightings.map((ref) => ref.title.trim().toLowerCase()).filter(Boolean),
    );
    const datasetSpeciesCount = datasets.reduce(
      (sum, ref) => sum + (ref.metrics?.speciesCount ?? 0),
      0,
    );
    return [
      sightingCount > 0
        ? copy.natureSightingCount(sightingCount)
        : datasets.length > 0
          ? copy.dataGroupCount(datasets.length)
          : null,
      species.size + datasetSpeciesCount > 0
        ? copy.speciesCount(species.size + datasetSpeciesCount)
        : null,
    ].filter((value): value is string => Boolean(value));
  }

  if (kind === "audio") {
    const referenceCount = references.filter((ref) => ref.kind === "audio").length;
    return [copy.recordingCount(Math.max(tileCount, referenceCount))];
  }

  if (kind === "file") return [copy.itemCount(tileCount)];
  return [];
}
