import type { OccurrenceRecord } from "@/app/_lib/indexer";
import { getOccurrenceDatasetRef } from "./occurrenceEvidenceClassification";
import { formatEvidenceDateRangeFromValues } from "./timelineDates";

export type TimelineDatasetStats = {
  itemCount: number;
  speciesCount: number;
  dateRange: string | null;
};

function occurrenceTitle(item: OccurrenceRecord): string {
  return item.scientificName ?? item.vernacularName ?? item.remarks ?? "";
}

export function getTreeGroupStats(
  treeGroupUri: string,
  occurrences: readonly OccurrenceRecord[],
): TimelineDatasetStats {
  const items = occurrences.filter((item) => getOccurrenceDatasetRef(item) === treeGroupUri);
  const species = new Set(
    items
      .map((item) => occurrenceTitle(item).trim().toLowerCase())
      .filter(Boolean),
  );

  return {
    itemCount: items.length,
    speciesCount: species.size,
    dateRange: formatEvidenceDateRangeFromValues(items.map((item) => item.eventDate ?? item.createdAt)),
  };
}
