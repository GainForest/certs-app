"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CirclePlusIcon,
  CrosshairIcon,
  GlobeIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/context";
import Container from "@/components/ui/container";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { deleteRecord } from "../../_lib/mutations";
import type { ManagedLocation } from "@/app/_lib/indexer";
import { SitesSkeleton } from "./SitesSkeleton";
import {
  SiteEditorModal,
  SiteEditorModalId,
} from "../../_modals/SiteEditorModal";

// ── Constants ─────────────────────────────────────────────────────────────────

const PREVIEW_APP_BASE_URL = "https://polygons-gainforest.vercel.app";

function generateSitePreviewUrl(did: string, rkey: string): string {
  const atUri = `at://${did}/app.certified.location/${rkey}`;
  return `${PREVIEW_APP_BASE_URL}/view?certifiedLocationRecordUri=${encodeURIComponent(atUri)}`;
}

// ── SiteCard ──────────────────────────────────────────────────────────────────

function SiteCard({
  site,
  onEdit,
  onDelete,
  onPreview,
  isPreviewing,
}: {
  site: ManagedLocation;
  onEdit: (site: ManagedLocation) => void;
  onDelete: (rkey: string) => void;
  onPreview?: (rkey: string) => void;
  isPreviewing?: boolean;
}) {
  const loc = site.record.location;
  const hasShapeLocation = loc?.kind === "uri" ||
    (site.record.locationType !== null &&
      site.record.locationType !== "point" &&
      site.record.locationType !== "coordinate-decimal");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-background transition-all duration-300 hover:border-primary/30 hover:shadow-md",
        isPreviewing ? "border-primary" : "border-border",
      )}
    >
      {/* Header */}
      <div className="flex h-10 items-center justify-between gap-2 border-b border-border px-3 pr-11">
        {loc?.kind === "point" ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CrosshairIcon className="h-3 w-3 shrink-0" />
            Point
          </span>
        ) : loc?.kind === "uri" || hasShapeLocation ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <GlobeIcon className="h-3 w-3 shrink-0" />
            Map area
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Location</span>
        )}
        {site.record.locationType && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
            {site.record.locationType}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1 px-3 py-2.5">
        <h3 className="text-base font-medium leading-snug">
          {site.record.name ?? <span className="text-muted-foreground">Unnamed site</span>}
        </h3>
        {loc?.kind === "point" && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CrosshairIcon className="h-3 w-3 shrink-0" />
            {loc.lat.toFixed(4)}°, {loc.lon.toFixed(4)}°
          </span>
        )}
        {loc?.kind === "uri" && (
          <span className="max-w-full truncate text-xs text-muted-foreground">
            {loc.uri}
          </span>
        )}
        {site.record.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {site.record.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="absolute right-1.5 top-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreVerticalIcon className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onPreview && hasShapeLocation && (
              <>
                <DropdownMenuItem onClick={() => onPreview(site.metadata.rkey)}>
                  <GlobeIcon className="mr-2 h-3.5 w-3.5" />
                  {isPreviewing ? "Viewing" : "View on map"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onEdit(site)}>
              <PencilIcon className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(site.metadata.rkey)}
            >
              <Trash2Icon className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

// ── SitesClient ───────────────────────────────────────────────────────────────

export function SitesClient({ did }: { did: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modal = useModal();

  const [sites, setSites] = useState<ManagedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingRkey, setDeletingRkey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [previewingRkey, setPreviewingRkey] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const loadSites = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/manage/sites");
      const data = (await res.json()) as ManagedLocation[] | { error: string };
      if (!res.ok || "error" in data) {
        setFetchError(("error" in data ? data.error : null) ?? "Failed to load sites.");
      } else {
        setSites(data);
      }
    } catch {
      setFetchError("Could not reach the server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadSites(); }, [loadSites]);

  useEffect(() => {
    const rkey = searchParams.get("rkey");
    if (!rkey || previewingRkey === rkey || !sites.some((s) => s.metadata.rkey === rkey)) return;
    setPreviewingRkey(rkey);
    setIframeUrl(generateSitePreviewUrl(did, rkey));
  }, [did, previewingRkey, searchParams, sites]);

  const handlePreviewSite = (rkey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("rkey", rkey);
    router.push(`?${params.toString()}`, { scroll: false });

    if (previewingRkey === rkey) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "load-uri", uri: `at://${did}/app.certified.location/${rkey}` },
        PREVIEW_APP_BASE_URL,
      );
    } else {
      setPreviewingRkey(rkey);
      setIframeUrl(generateSitePreviewUrl(did, rkey));
    }
  };

  const allSiteRkeys = sites.map((s) => s.metadata.rkey).filter(Boolean) as string[];
  const currentSiteIndex = previewingRkey ? allSiteRkeys.indexOf(previewingRkey) : -1;

  const handleOpenAdd = () => {
    modal.pushModal(
      {
        id: SiteEditorModalId,
        dialogWidth: "max-w-lg",
        content: (
          <SiteEditorModal
            did={did}
            initialData={null}
            onSaved={() => void loadSites()}
          />
        ),
      },
      true,
    );
    void modal.show();
  };

  const handleOpenEdit = (site: ManagedLocation) => {
    const rkey = site.metadata.rkey;
    const hasShapeLocation =
      site.record.location?.kind === "uri" ||
      (site.record.locationType !== null &&
        site.record.locationType !== "point" &&
        site.record.locationType !== "coordinate-decimal");

    modal.pushModal(
      {
        id: `${SiteEditorModalId}-${rkey}`,
        dialogWidth: "max-w-lg",
        content: (
          <SiteEditorModal
            did={did}
            initialData={{ rkey, name: site.record.name ?? "", hasShapeLocation: Boolean(hasShapeLocation) }}
            onSaved={() => void loadSites()}
          />
        ),
      },
      true,
    );
    void modal.show();
  };

  const handleDelete = async (rkey: string) => {
    setDeletingRkey(rkey);
    setDeleteError(null);
    try {
      await deleteRecord("app.certified.location", rkey);
      setSites((prev) => prev.filter((s) => s.metadata.rkey !== rkey));
      if (previewingRkey === rkey) {
        setPreviewingRkey(null);
        setIframeUrl(null);
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete site.");
    } finally {
      setDeletingRkey(null);
    }
  };

  if (isLoading) {
    return <SitesSkeleton />;
  }

  return (
    <Container className="space-y-6 pb-8 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-garamond text-2xl font-bold">Sites</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your certified field locations.
          </p>
        </div>
        <Button size="sm" className="rounded-full" onClick={handleOpenAdd}>
          <CirclePlusIcon />
          Add site
        </Button>
      </div>

      {/* Map preview iframe */}
      {iframeUrl && previewingRkey && (
        <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-border">
          <iframe ref={iframeRef} className="h-full w-full" src={iframeUrl} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between p-4">
            <Button
              size="icon"
              variant="outline"
              className="pointer-events-auto"
              disabled={currentSiteIndex <= 0}
              onClick={() => {
                const prevRkey = allSiteRkeys[currentSiteIndex - 1];
                if (prevRkey) handlePreviewSite(prevRkey);
              }}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="pointer-events-auto"
              disabled={currentSiteIndex >= allSiteRkeys.length - 1}
              onClick={() => {
                const nextRkey = allSiteRkeys[currentSiteIndex + 1];
                if (nextRkey) handlePreviewSite(nextRkey);
              }}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Errors */}
      {fetchError && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <span>{fetchError}</span>
          <Button variant="outline" size="sm" onClick={() => void loadSites()}>
            Retry
          </Button>
        </div>
      )}
      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

      {/* Content */}
      {sites.length === 0 && !fetchError ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex h-48 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border text-center"
        >
          <p className="font-garamond text-xl font-semibold text-muted-foreground">
            No sites yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add your first certified field location to get started.
          </p>
          <Button variant="outline" size="sm" onClick={handleOpenAdd}>
            <CirclePlusIcon />
            Add a site
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <div key={site.metadata.uri ?? site.metadata.rkey} className="relative">
              {deletingRkey === site.metadata.rkey && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
                  <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <SiteCard
                site={site}
                onEdit={handleOpenEdit}
                onDelete={(rkey) => void handleDelete(rkey)}
                onPreview={handlePreviewSite}
                isPreviewing={previewingRkey === site.metadata.rkey}
              />
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
