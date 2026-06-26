"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TimelineAttachmentItem } from "@/app/_lib/indexer";
import { EvidenceAdder } from ".";
import type { TimelineMutationPermission, TimelineSourceData } from "./shared/types";

type TimelineEvidenceManagerProps = {
  organizationDid: string;
  activityUri: string;
  activityCid: string;
  bumicertTitle: string;
  sources: TimelineSourceData;
  entries: TimelineAttachmentItem[];
  attachmentsUnavailable: boolean;
  createPermission: TimelineMutationPermission;
  mutationRepo?: string;
  onCreated: (created: TimelineAttachmentItem) => void;
  onChanged: () => void;
};

export function TimelineEvidenceManager({
  organizationDid,
  activityUri,
  activityCid,
  bumicertTitle,
  sources,
  entries,
  attachmentsUnavailable,
  createPermission,
  mutationRepo,
  onCreated,
  onChanged,
}: TimelineEvidenceManagerProps) {
  const timelineT = useTranslations("bumicert.detail.timeline");
  const [status, setStatus] = useState<string | null>(null);

  function handleCreated(created: TimelineAttachmentItem) {
    onCreated(created);
    setStatus(timelineT("linkSuccess"));
  }

  return (
    <section
      className="rounded-3xl border border-primary/25 bg-primary/5 p-4 shadow-sm ring-1 ring-primary/10"
      aria-labelledby="link-evidence-heading"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {timelineT("timelineTools")}
          </p>
          <h2 id="link-evidence-heading" className="mt-1 text-2xl tracking-tight text-foreground">
            {timelineT("linkEvidenceTitle")}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {timelineT("linkEvidenceDescription", { title: bumicertTitle })}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-primary/25 bg-background/80 px-3 py-1 text-xs font-medium text-primary">
          {timelineT("notTimelineYet")}
        </span>
      </div>
      {attachmentsUnavailable ? (
        <p className="mt-3 rounded-2xl border border-warn/20 bg-warn/10 px-3 py-2 text-sm text-warn">
          {timelineT("linksUnavailable")}
        </p>
      ) : null}
      <div className="mt-4 rounded-2xl border border-border/60 bg-background/85 p-4 shadow-xs">
        <EvidenceAdder
          organizationDid={organizationDid}
          activityUri={activityUri}
          activityCid={activityCid}
          sources={sources}
          entries={entries}
          attachmentsUnavailable={attachmentsUnavailable}
          createPermission={createPermission}
          mutationRepo={mutationRepo}
          onCreated={handleCreated}
          onChanged={onChanged}
        />
      </div>
      {status ? <p className="mt-3 text-sm text-primary">{status}</p> : null}
    </section>
  );
}
