"use client";

import type { TimelineAttachmentItem } from "@/app/_lib/indexer";
import type { TimelineReference } from "@/app/cert/[did]/[rkey]/_components/timeline/timelineReferences";
import { TimelinePanel } from "@/app/cert/[did]/[rkey]/_components/timeline/viewers/TimelinePanel";

const EMPTY_SOURCES = {
  audio: [],
  occurrences: [],
  occurrencesIncomplete: false,
  treeGroups: [],
  places: [],
};

// Read-only timeline for the public project page: the same panel the Cert page
// uses, with every editing affordance turned off.
export function ProjectTimelineReadonly({
  organizationDid,
  entries,
  references,
}: {
  organizationDid: string;
  entries: TimelineAttachmentItem[];
  references: TimelineReference[];
}) {
  return (
    <TimelinePanel
      organizationDid={organizationDid}
      entries={entries}
      sources={EMPTY_SOURCES}
      references={references}
      canManageEvidence={false}
      deletePermission={{ allowed: false, reason: null }}
      onDeleted={() => {}}
      summaryScope="activity"
    />
  );
}
