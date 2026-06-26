import { describe, expect, it } from "vitest";
import type { TimelineAttachmentItem } from "@/app/_lib/indexer";
import type { TimelineEntryViewModel } from "../../shared/timelineViewModel";
import type { TimelineReference } from "./referenceResolution/timelineReferences";
import {
  getTimelineEntryMetricBadges,
  getTimelineEntryRecordedDate,
  getTimelineEntryTitle,
  type EntryKindLabels,
  type MetricCopy,
} from "./timelineEntryPresentation";

const labels: EntryKindLabels = {
  tree: "Tree",
  audio: "Sound",
  nature: "Nature",
  file: "File",
  site: "Place",
  other: "Other",
};

const metricCopy: MetricCopy = {
  treeCount: (count) => `${count} trees`,
  speciesCount: (count) => `${count} species`,
  natureSightingCount: (count) => `${count} sightings`,
  dataGroupCount: (count) => `${count} groups`,
  recordingCount: (count) => `${count} recordings`,
  itemCount: (count) => `${count} items`,
};

function attachment(title: string | null): TimelineAttachmentItem {
  return {
    metadata: {
      did: "did:example:org",
      uri: "at://did:example:org/org.hypercerts.context.attachment/entry",
      rkey: "entry",
      cid: null,
      createdAt: null,
      indexedAt: null,
    },
    creatorInfo: null,
    record: {
      title,
      shortDescription: null,
      description: null,
      contentType: null,
      subjects: null,
      content: null,
      createdAt: null,
    },
  };
}

function entry(overrides: Partial<TimelineEntryViewModel>): TimelineEntryViewModel {
  return {
    item: attachment(null),
    index: 0,
    entryId: "entry",
    refs: [],
    kind: "other",
    tiles: [],
    ...overrides,
  };
}

describe("timelineEntryPresentation", () => {
  it("uses a tree reference title and tree metrics for tree entries", () => {
    const refs: TimelineReference[] = [
      {
        id: "at://did:example:org/app.gainforest.dwc.dataset/trees",
        kind: "tree",
        title: "Restoration trees",
        metrics: { treeCount: 12, speciesCount: 3 },
      },
    ];
    const model = entry({ kind: "tree", refs });

    expect(getTimelineEntryTitle({ entry: model, labels, natureFallback: "Nature data" })).toBe("Restoration trees");
    expect(getTimelineEntryMetricBadges("tree", refs, 1, metricCopy)).toEqual([
      "12 trees",
      "3 species",
    ]);
  });

  it("formats recorded ranges from reference dates", () => {
    expect(getTimelineEntryRecordedDate("nature", [
      { id: "one", kind: "occurrence", title: "One", recordedAt: "2024-01" },
      { id: "two", kind: "occurrence", title: "Two", recordedAt: "2024-03" },
    ], "Not specified")).toBe("Jan 2024 – Mar 2024");
  });
});
