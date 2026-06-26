"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TimelineAttachmentItem } from "@/app/_lib/indexer";
import { Button } from "@/components/ui/button";
import { EVIDENCE_TABS } from "./shared/evidenceRegistry";
import { getLinkedNatureUris, getLinkedTreeGroupUris } from "./shared/linkedEvidence";
import { AudioEvidencePicker } from "./AudioEvidencePicker";
import { TreeEvidencePicker } from "./TreeEvidencePicker";
import { NatureEvidencePicker } from "./NatureEvidencePicker";
import { FileEvidencePicker } from "./FileEvidencePicker";
import {
  type EvidenceTab,
  type TimelineMutationPermission,
  type TimelineSourceData,
} from "./shared/types";
import { useEvidenceSubmission } from "./shared/useEvidenceSubmission";
import { useTimelineSourceData } from "./shared/useTimelineSourceData";

export type { TimelineMutationPermission, TimelineSourceData } from "./shared/types";

export function EvidenceAdder({
  organizationDid,
  activityUri,
  activityCid,
  sources,
  entries,
  attachmentsUnavailable,
  createPermission,
  mutationRepo,
  onCreated,
  onChanged,
}: {
  organizationDid: string;
  activityUri: string;
  activityCid: string;
  sources: TimelineSourceData;
  entries: TimelineAttachmentItem[];
  attachmentsUnavailable: boolean;
  createPermission: TimelineMutationPermission;
  mutationRepo?: string;
  onCreated: (entry: TimelineAttachmentItem) => void;
  onChanged: () => void;
}) {
  const evidenceT = useTranslations("bumicert.detail.evidenceAdder");
  const [activeTab, setActiveTab] = useState<EvidenceTab | null>(null);
  const sourceState = useTimelineSourceData({ organizationDid, sources, activeTab });
  const { error, isSubmitting, submitDrafts } = useEvidenceSubmission({
    activityUri,
    activityCid,
    organizationDid,
    createPermission,
    mutationRepo,
    onCreated,
    onChanged,
  });
  const linkedTreeGroups = useMemo(() => getLinkedTreeGroupUris(entries), [entries]);
  const linkedNatureUris = useMemo(() => getLinkedNatureUris(entries), [entries]);
  const tabLabels: Record<EvidenceTab, string> = {
    audio: evidenceT("tabs.audio"),
    trees: evidenceT("tabs.trees"),
    nature: evidenceT("tabs.biodiversity"),
    files: evidenceT("tabs.files"),
  };
  const tabDescriptions: Record<EvidenceTab, string> = {
    audio: evidenceT("tabDescriptions.audio"),
    trees: evidenceT("tabDescriptions.trees"),
    nature: evidenceT("tabDescriptions.biodiversity"),
    files: evidenceT("tabDescriptions.files"),
  };


  if (activeTab === null) {
    return (
      <div className="flex flex-col">
        <span className="text-2xl font-medium text-foreground">
          {evidenceT("chooseEvidenceType")}
        </span>
        <span className="text-sm text-muted-foreground">
          {evidenceT("selectSourceToLink")}
        </span>
        {!createPermission.allowed ? (
          <p className="mt-3 rounded-xl border border-warn/20 bg-warn/10 px-3 py-2 text-sm text-warn">
            {createPermission.reason ?? evidenceT("permissions.createDenied")}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EVIDENCE_TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              disabled={!createPermission.allowed}
              title={
                !createPermission.allowed
                  ? createPermission.reason ?? evidenceT("permissions.createDenied")
                  : undefined
              }
              className="flex min-h-32 flex-col items-start justify-between rounded-2xl border border-border/60 bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon className="h-5 w-5 text-primary/70" />
              <span>
                <span className="block text-base font-medium text-foreground">
                  {tabLabels[id]}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {tabDescriptions[id]}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const activeConfig = EVIDENCE_TABS.find((tab) => tab.id === activeTab)!;
  const activeTabNeedsSources = activeTab !== "files";
  const activeSources = sourceState.data;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          disabled={isSubmitting}
          aria-label={evidenceT("backToEvidenceTypes")}
          onClick={() => setActiveTab(null)}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="flex flex-col">
          <span className="text-2xl font-medium text-foreground">
            {evidenceT("linkType", { type: tabLabels[activeConfig.id] })}
          </span>
          <span className="text-sm text-muted-foreground">
            {evidenceT("selectRecordsToLink")}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {activeTabNeedsSources && sourceState.status === "loading" ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            {evidenceT("loadingSources")}
          </div>
        ) : null}
        {activeTabNeedsSources && sourceState.status === "error" ? (
          <p className="rounded-xl border border-warn/20 bg-warn/10 px-3 py-2 text-sm text-warn">
            {evidenceT("sourcesLoadError")}
          </p>
        ) : null}
        {sourceState.status === "ready" && activeTab === "audio" ? (
          <AudioEvidencePicker
            data={activeSources.audio}
            isSubmitting={isSubmitting}
            submitDrafts={submitDrafts}
          />
        ) : null}
        {sourceState.status === "ready" && activeTab === "trees" ? (
          <TreeEvidencePicker
            data={activeSources.treeGroups}
            occurrences={activeSources.occurrences}
            places={activeSources.places}
            linkedTreeGroups={linkedTreeGroups}
            timelineAttachmentsUnavailable={attachmentsUnavailable}
            occurrenceCoverageIncomplete={activeSources.occurrencesIncomplete}
            isSubmitting={isSubmitting}
            submitDrafts={submitDrafts}
          />
        ) : null}
        {sourceState.status === "ready" && activeTab === "nature" ? (
          <NatureEvidencePicker
            occurrences={activeSources.occurrences}
            datasets={activeSources.treeGroups}
            linkedUris={linkedNatureUris}
            isSubmitting={isSubmitting}
            submitDrafts={submitDrafts}
          />
        ) : null}
        {activeTab === "files" ? (
          <FileEvidencePicker
            isSubmitting={isSubmitting}
            submitDrafts={submitDrafts}
          />
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
