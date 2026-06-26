"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDownIcon, ExternalLinkIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDate } from "@/app/_lib/format";
import { cn } from "@/lib/utils";
import {
  deleteContextAttachment,
  isAttachmentMutationInputError,
} from "../shared/contextAttachmentMutations";
import type { TimelineEntryViewModel } from "../shared/timelineViewModel";
import { getTimelineDeleteControlState } from "../shared/timelineDeleteControls";
import { TimelineDeleteConfirm } from "./shared/TimelineDeleteConfirm";
import { TimelineDatasetMapLayerCards } from "./shared/TimelineDatasetMapLayerCards";
import { TimelineOptionalNote } from "./shared/TimelineOptionalNote";
import { TimelinePreviewPanel } from "./shared/TimelinePreviewPanel";
import { TimelineTileRow } from "./shared/TimelineTileRow";
import type { TimelineMapLayer } from "./shared/timelineMapLayers";
import {
  getTimelineEntryKindLabel,
  getTimelineEntryMetricBadges,
  getTimelineEntryRecordedDate,
  getTimelineEntryTitle,
  type EntryKindLabels,
  type MetricCopy,
} from "./shared/timelineEntryPresentation";

export function TimelineEntry({
  entry,
  mapLayers,
  canManageEvidence,
  canDeleteEvidence,
  deleteDisabledReason,
  mutationRepo,
  onDeleted,
}: {
  entry: TimelineEntryViewModel;
  mapLayers: TimelineMapLayer[];
  canManageEvidence: boolean;
  canDeleteEvidence: boolean;
  deleteDisabledReason: string | null;
  mutationRepo?: string;
  onDeleted: (rkey: string) => void;
}) {
  const entryT = useTranslations("bumicert.detail.timelineEntry");
  const [expanded, setExpanded] = useState(entry.index === 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const panelId = useId();
  const rkey = entry.item.metadata.rkey;
  const labels: EntryKindLabels = {
    tree: entryT("kind.tree"),
    audio: entryT("kind.audio"),
    nature: entryT("kind.biodiversity"),
    file: entryT("kind.document"),
    site: entryT("kind.site"),
    other: entryT("kind.other"),
  };
  const metricCopy: MetricCopy = {
    treeCount: (count) => entryT("treeCount", { count }),
    speciesCount: (count) => entryT("speciesCount", { count }),
    natureSightingCount: (count) => entryT("observationCount", { count }),
    dataGroupCount: (count) => entryT("dataGroupCount", { count }),
    recordingCount: (count) => entryT("recordingCount", { count }),
    itemCount: (count) => entryT("itemCount", { count }),
  };
  const title = getTimelineEntryTitle({
    entry,
    labels,
    natureFallback: entryT("natureObservationsFallback"),
  });
  const badges = getTimelineEntryMetricBadges(entry.kind, entry.refs, entry.tiles.length, metricCopy);
  const linkedDate =
    formatDate(entry.item.record.createdAt ?? entry.item.metadata.createdAt) ||
    entryT("notSpecified");
  const recordedDate = getTimelineEntryRecordedDate(
    entry.kind,
    entry.refs,
    entryT("notSpecified"),
  );
  const mapHref = entry.refs.find((ref) => ref.mapHref)?.mapHref ?? null;
  const previewTiles = useMemo(
    () =>
      entry.tiles.filter((tile) => {
        if (!tile.preview) return false;
        if (entry.kind === "nature" && tile.preview.kind === "text") return false;
        return true;
      }),
    [entry.kind, entry.tiles],
  );
  const selectedTile = activeTileId
    ? previewTiles.find((tile) => tile.id === activeTileId)
    : undefined;
  const activePreview = selectedTile?.preview ?? previewTiles[0]?.preview ?? null;
  const natureRefs = entry.refs.filter(
    (ref) => ref.kind === "occurrence" || ref.kind === "biodiversityDataset",
  );
  const deleteControl = getTimelineDeleteControlState({
    canManageEvidence,
    canDeleteEvidence,
    rkey,
    deleteDisabledReason,
  });

  async function handleDelete() {
    if (!rkey) return;
    if (!canDeleteEvidence) {
      setDeleteError(deleteDisabledReason ?? entryT("deleteUnavailable"));
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteContextAttachment({ rkey, repo: mutationRepo });
      onDeleted(rkey);
      setShowDeleteConfirm(false);
    } catch (error) {
      if (isAttachmentMutationInputError(error) && error.code === "not-found") {
        setDeleteError(entryT("deleteAlreadyRemoved"));
        onDeleted(rkey);
        setShowDeleteConfirm(false);
        return;
      }
      console.error("Unable to remove timeline evidence", error);
      setDeleteError(entryT("deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <motion.article
      className="rounded-2xl border border-border/60 bg-background shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(entry.index * 0.04, 0.2),
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-primary">{getTimelineEntryKindLabel(entry.kind, labels)}</span>
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {badge}
              </span>
            ))}
          </div>
          <h3 className="mt-1 text-base text-foreground">{title}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{recordedDate}</span>
            <span>{entryT("linked", { date: linkedDate })}</span>
          </div>
        </button>
        <div className="flex items-center gap-1">
          {mapHref ? (
            <Link
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={entryT("openMap")}
            >
              <ExternalLinkIcon className="h-4 w-4" />
            </Link>
          ) : null}
          {deleteControl.showButton ? (
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(true);
                setDeleteError(null);
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={entryT("removeEvidence")}
            >
              <Trash2Icon className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((value) => !value)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={expanded ? entryT("collapseEvidence") : entryT("expandEvidence")}
          >
            <ChevronDownIcon
              className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {expanded ? (
        <div id={panelId} className="space-y-3 border-t border-border/50 p-4 pt-3">
          <TimelineOptionalNote note={entry.item.record.description} />
          {deleteControl.showDeniedMessage ? (
            <p className="rounded-xl border border-warn/20 bg-warn/10 px-3 py-2 text-xs text-warn">
              {deleteControl.disabledReason}
            </p>
          ) : null}
          {entry.kind === "nature" && natureRefs.length > 0 ? (
            <div className="rounded-xl bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                {entryT("displayedBiodiversityData")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {natureRefs.slice(0, 8).map((ref) => (
                  <span
                    key={ref.id}
                    className="rounded-full bg-background px-2.5 py-1 text-xs text-foreground shadow-xs"
                  >
                    {ref.title}
                  </span>
                ))}
                {natureRefs.length > 8 ? (
                  <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground shadow-xs">
                    {entryT("more", { count: natureRefs.length - 8 })}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
          <TimelineDatasetMapLayerCards layers={mapLayers} />
          <TimelinePreviewPanel preview={activePreview} />
          {previewTiles.length > 1 ? (
            <TimelineTileRow
              tiles={previewTiles}
              activeTileId={activeTileId ?? previewTiles[0]?.id ?? null}
              onTileClick={(tile) => setActiveTileId(tile.id)}
            />
          ) : null}
          {mapHref && !activePreview ? (
            <Link
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-foreground hover:bg-muted/30"
            >
              {entryT("viewMap")}
              <ExternalLinkIcon className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {rkey ? (
        <TimelineDeleteConfirm
          open={showDeleteConfirm}
          title={title}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeleteError(null);
          }}
          isDeleting={isDeleting}
          error={deleteError}
        />
      ) : null}
    </motion.article>
  );
}
