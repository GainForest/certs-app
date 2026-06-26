"use client";

import { useEffect, useState } from "react";
import type { OccurrenceRecord } from "@/app/_lib/indexer";
import {
  fetchAudioByDid,
  fetchLocationsByDid,
  fetchOccurrencesByDid,
  fetchTreeDatasetsByDid,
} from "@/app/_lib/indexer";
import { hasTimelineSourceData, type EvidenceTab, type TimelineSourceData, type TimelineSourceStatus } from "./types";

export type TimelineSourceState = {
  status: TimelineSourceStatus;
  data: TimelineSourceData;
};

export function useTimelineSourceData(args: {
  organizationDid: string;
  sources: TimelineSourceData;
  activeTab: EvidenceTab | null;
}): TimelineSourceState {
  const [sourceState, setSourceState] = useState<TimelineSourceState>(() => ({
    status: hasTimelineSourceData(args.sources) ? "ready" : "idle",
    data: args.sources,
  }));

  useEffect(() => {
    if (args.activeTab === null || args.activeTab === "files" || sourceState.status !== "idle") {
      return;
    }

    setSourceState((current) =>
      current.status === "idle" ? { ...current, status: "loading" } : current,
    );
  }, [args.activeTab, sourceState.status]);

  useEffect(() => {
    if (sourceState.status !== "loading") {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    Promise.all([
      fetchAudioByDid(args.organizationDid, controller.signal).catch(() => []),
      fetchOccurrencesByDid(args.organizationDid, 10000, null, controller.signal).catch(() => ({
        records: [] as OccurrenceRecord[],
        cursor: null,
        hasMore: true,
      })),
      fetchTreeDatasetsByDid(args.organizationDid, controller.signal).catch(() => []),
      fetchLocationsByDid(args.organizationDid, controller.signal).catch(() => []),
    ])
      .then(([audio, occurrencePage, treeGroups, places]) => {
        if (cancelled) return;
        setSourceState({
          status: "ready",
          data: {
            audio,
            occurrences: occurrencePage.records,
            occurrencesIncomplete: occurrencePage.hasMore,
            treeGroups,
            places,
          },
        });
      })
      .catch((err) => {
        if (cancelled || (err instanceof Error && err.name === "AbortError")) return;
        setSourceState((current) => ({ ...current, status: "error" }));
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [args.organizationDid, sourceState.status]);

  return sourceState;
}
