"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import type { TimelineAttachmentItem } from "@/app/_lib/indexer";
import { isAttachmentForActivity } from "./shared/attachmentSubjects";
import type { TimelineMutationPermission, TimelineSourceData } from "./EvidenceAdder";
import { TimelineEvidenceManager } from "./EvidenceAdder/TimelineEvidenceManager";
import type { TimelineReference } from "./viewers/shared/referenceResolution/timelineReferences";
import { TimelinePanel } from "./viewers/TimelinePanel";

type BumicertTimelineProps = {
  organizationDid: string;
  activityUri: string;
  activityCid: string;
  bumicertTitle: string;
  canManageEvidence: boolean;
  createPermission: TimelineMutationPermission;
  deletePermission: TimelineMutationPermission;
  mutationRepo?: string;
  initialEntries: TimelineAttachmentItem[];
  sources: TimelineSourceData;
  references?: TimelineReference[];
  attachmentsUnavailable: boolean;
};

export function BumicertTimeline({
  organizationDid,
  activityUri,
  activityCid,
  bumicertTitle,
  canManageEvidence,
  createPermission,
  deletePermission,
  mutationRepo,
  initialEntries,
  sources,
  references = [],
  attachmentsUnavailable,
}: BumicertTimelineProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(() =>
    initialEntries.filter((entry) => isAttachmentForActivity(entry, activityUri)),
  );

  function handleCreated(created: TimelineAttachmentItem) {
    setEntries((current) => [
      created,
      ...current.filter((entry) => entry.metadata.rkey !== created.metadata.rkey),
    ]);
  }

  function handleDeleted(rkey: string) {
    setEntries((current) => current.filter((entry) => entry.metadata.rkey !== rkey));
    router.refresh();
  }

  return (
    <motion.article
      key="timeline"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1"
    >
      <div className="flex flex-col gap-6">
        {canManageEvidence ? (
          <TimelineEvidenceManager
            organizationDid={organizationDid}
            activityUri={activityUri}
            activityCid={activityCid}
            bumicertTitle={bumicertTitle}
            sources={sources}
            entries={entries}
            attachmentsUnavailable={attachmentsUnavailable}
            createPermission={createPermission}
            mutationRepo={mutationRepo}
            onCreated={handleCreated}
            onChanged={() => router.refresh()}
          />
        ) : null}

        <TimelinePanel
          organizationDid={organizationDid}
          entries={entries}
          sources={sources}
          references={references}
          canManageEvidence={canManageEvidence}
          deletePermission={deletePermission}
          mutationRepo={mutationRepo}
          onDeleted={handleDeleted}
        />
      </div>
    </motion.article>
  );
}
