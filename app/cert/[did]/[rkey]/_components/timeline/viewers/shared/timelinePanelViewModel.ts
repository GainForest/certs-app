import type { TimelineEntryViewModel } from "../../shared/timelineViewModel";
import { buildTimelineMapLayers, type TimelineMapLayer } from "./timelineMapLayers";

export type TimelineEntryListItem = TimelineEntryViewModel & {
  mapLayers: TimelineMapLayer[];
};

export function buildTimelineEntryListItems(
  entries: TimelineEntryViewModel[],
): TimelineEntryListItem[] {
  return entries.map((entry) => ({
    ...entry,
    mapLayers: buildTimelineMapLayers([{ item: entry.item, references: entry.refs }]),
  }));
}

export function getUniqueTimelineMapLayers(
  entries: readonly TimelineEntryListItem[],
): TimelineMapLayer[] {
  const seenDatasetUris = new Set<string>();
  const layers: TimelineMapLayer[] = [];

  for (const entry of entries) {
    for (const layer of entry.mapLayers) {
      if (seenDatasetUris.has(layer.datasetUri)) continue;
      seenDatasetUris.add(layer.datasetUri);
      layers.push(layer);
    }
  }

  return layers;
}
