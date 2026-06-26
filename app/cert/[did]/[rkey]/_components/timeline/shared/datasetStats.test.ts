import { describe, expect, it } from "vitest";
import type { OccurrenceRecord } from "@/app/_lib/indexer";
import { getTreeGroupStats } from "./datasetStats";

function occurrence(overrides: Partial<OccurrenceRecord>): OccurrenceRecord {
  return {
    atUri: overrides.atUri ?? "at://did:example:org/app.gainforest.dwc.occurrence/occ",
    cid: overrides.cid ?? "cid",
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    datasetRef: overrides.datasetRef ?? null,
    datasetName: overrides.datasetName ?? null,
    scientificName: overrides.scientificName ?? null,
    vernacularName: overrides.vernacularName ?? null,
    kingdom: overrides.kingdom ?? null,
    family: overrides.family ?? null,
    genus: overrides.genus ?? null,
    eventDate: overrides.eventDate ?? null,
    recordedBy: overrides.recordedBy ?? null,
    locality: overrides.locality ?? null,
    country: overrides.country ?? null,
    individualCount: overrides.individualCount ?? null,
    establishmentMeans: overrides.establishmentMeans ?? null,
    dynamicProperties: overrides.dynamicProperties ?? null,
    remarks: overrides.remarks ?? null,
  } as OccurrenceRecord;
}

describe("getTreeGroupStats", () => {
  it("counts matching records and unique species only", () => {
    const stats = getTreeGroupStats("dataset-a", [
      occurrence({ datasetRef: "dataset-a", scientificName: "Ceiba pentandra", eventDate: "2024-01" }),
      occurrence({ datasetRef: "dataset-a", scientificName: "ceiba pentandra", eventDate: "2024-02" }),
      occurrence({ datasetRef: "dataset-a", vernacularName: "Kapok", eventDate: "2024-03" }),
      occurrence({ datasetRef: "dataset-b", scientificName: "Other" }),
    ]);

    expect(stats).toEqual({
      itemCount: 3,
      speciesCount: 2,
      dateRange: "Jan 2024 – Mar 2024",
    });
  });
});
