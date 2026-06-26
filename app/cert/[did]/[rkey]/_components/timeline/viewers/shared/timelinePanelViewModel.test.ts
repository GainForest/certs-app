import { describe, expect, it } from "vitest";
import type { TimelineAttachmentItem } from "@/app/_lib/indexer";
import type { TimelineEntryViewModel } from "../../shared/timelineViewModel";
import type { TimelineReference } from "./referenceResolution/timelineReferences";
import { buildTimelineEntryListItems, getUniqueTimelineMapLayers } from "./timelinePanelViewModel";

function attachment(rkey: string): TimelineAttachmentItem {
  return {
    metadata: {
      did: "did:example:org",
      uri: `at://did:example:org/org.hypercerts.context.attachment/${rkey}`,
      rkey,
      cid: null,
      createdAt: null,
      indexedAt: null,
    },
    creatorInfo: null,
    record: {
      title: null,
      shortDescription: null,
      description: null,
      contentType: "tree-dataset",
      subjects: null,
      content: null,
      createdAt: null,
    },
  };
}

function treeReference(datasetUri: string): TimelineReference {
  return {
    id: datasetUri,
    kind: "tree",
    title: "Tree group",
    treeGroupUri: datasetUri,
  };
}

function entry(rkey: string, refs: TimelineReference[]): TimelineEntryViewModel {
  return {
    item: attachment(rkey),
    index: 0,
    entryId: rkey,
    refs,
    kind: "tree",
    tiles: [],
  };
}

describe("timelinePanelViewModel", () => {
  it("adds per-entry map layers and deduplicates the summary layers", () => {
    const datasetUri = "at://did:example:org/app.gainforest.dwc.dataset/trees";
    const items = buildTimelineEntryListItems([
      entry("first", [treeReference(datasetUri)]),
      entry("second", [treeReference(datasetUri)]),
    ]);

    expect(items.map((item) => item.mapLayers)).toHaveLength(2);
    expect(getUniqueTimelineMapLayers(items)).toEqual([
      expect.objectContaining({ datasetUri, title: "Tree group" }),
    ]);
  });
});
