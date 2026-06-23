"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ChangeEvent, type ComponentProps } from "react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { CheckCircle2Icon, ChevronLeftIcon, ImagePlusIcon, Loader2Icon, UploadCloudIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecordExplorer } from "@/app/_components/RecordExplorer";
import { TAINA_SIM } from "@/app/_lib/taina-sim";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Container from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TelegramIcon from "@/icons/TelegramIcon";
import { manageHref, type ManageTarget } from "@/lib/links";
import { canCreateRecord } from "../../_lib/cgs-permissions";
import {
  configureObservationMutationRepo,
  createObservationOccurrence,
  createObservationPhoto,
  formatObservationMutationError,
} from "./observation-mutations";

type InitialPage = NonNullable<ComponentProps<typeof RecordExplorer>["initialPage"]>;
type Mode = "list" | "add";
type ItemStatus = "analyzing" | "ready" | "error" | "uploading" | "uploaded" | "uploadError";

type ObservationAnalysis = {
  scientificName: string;
  vernacularName: string;
  kingdom: string;
  eventDate: string;
  recordedBy: string;
  decimalLatitude: string;
  decimalLongitude: string;
  country: string;
  locality: string;
  habitat: string;
  occurrenceRemarks: string;
  subjectPart: string;
  caption: string;
  confidence: number | null;
};

type ObservationUploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  originalSize: number;
  compressed: boolean;
  groupId: string;
  selected: boolean;
  status: ItemStatus;
  progress: number;
  analysis: ObservationAnalysis;
  error: string | null;
  uploadedUri: string | null;
};

const TAINA_BOT_URL = "https://t.me/The" + "Tain" + "aBot";
const QUERY_STATE_OPTIONS = { history: "replace", scroll: false, shallow: true } as const;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const EMPTY_ANALYSIS: ObservationAnalysis = {
  scientificName: "",
  vernacularName: "",
  kingdom: "Plantae",
  eventDate: "",
  recordedBy: "",
  decimalLatitude: "",
  decimalLongitude: "",
  country: "",
  locality: "",
  habitat: "",
  occurrenceRemarks: "",
  subjectPart: "wholeOrganism",
  caption: "",
  confidence: null,
};

type AnalyzeResponse = { analysis?: Partial<ObservationAnalysis>; error?: string };

function cleanFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function dateFromFile(file: File): string {
  const date = file.lastModified ? new Date(file.lastModified) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not prepare image."));
    }, mimeType, quality);
  });
}

async function compressImageIfNeeded(file: File): Promise<{ file: File; compressed: boolean; originalSize: number }> {
  if (file.size <= MAX_IMAGE_BYTES) return { file, compressed: false, originalSize: file.size };

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image.");

  let width = bitmap.width;
  let height = bitmap.height;
  const mimeType = "image/jpeg";
  const extensionless = file.name.replace(/\.[^.]+$/, "") || "observation";

  for (const scale of [1, 0.86, 0.72, 0.6, 0.5, 0.42]) {
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46]) {
      const blob = await canvasToBlob(canvas, mimeType, quality);
      if (blob.size <= MAX_IMAGE_BYTES) {
        return {
          file: new File([blob], `${extensionless}.jpg`, { type: mimeType, lastModified: file.lastModified }),
          compressed: true,
          originalSize: file.size,
        };
      }
    }
  }

  throw new Error("Could not prepare image.");
}

function normalizeAnalysis(raw: Partial<ObservationAnalysis> | undefined, file: File): ObservationAnalysis {
  const fallbackDate = dateFromFile(file);
  return {
    scientificName: raw?.scientificName?.trim() || "Unidentified organism",
    vernacularName: raw?.vernacularName?.trim() || "",
    kingdom: raw?.kingdom?.trim() || "Plantae",
    eventDate: raw?.eventDate?.trim() || fallbackDate,
    recordedBy: raw?.recordedBy?.trim() || "",
    decimalLatitude: raw?.decimalLatitude?.trim() || "",
    decimalLongitude: raw?.decimalLongitude?.trim() || "",
    country: raw?.country?.trim() || "",
    locality: raw?.locality?.trim() || "",
    habitat: raw?.habitat?.trim() || "",
    occurrenceRemarks: raw?.occurrenceRemarks?.trim() || "",
    subjectPart: raw?.subjectPart?.trim() || "wholeOrganism",
    caption: raw?.caption?.trim() || cleanFileName(file.name),
    confidence: typeof raw?.confidence === "number" ? raw.confidence : null,
  };
}

function analysisErrorMessage(code: string | undefined, t: ReturnType<typeof useTranslations>): string {
  if (code === "not_configured") return t("analysisNotConfigured");
  if (code === "unsupported_image") return t("unsupportedImage");
  if (code === "image_too_large") return t("imageTooLarge");
  return t("analysisFailed");
}

function itemCanUpload(item: ObservationUploadItem): boolean {
  return (item.status === "ready" || item.status === "uploadError") && item.analysis.scientificName.trim().length > 0 && item.analysis.eventDate.trim().length > 0;
}

function observationGroupOptions(items: ObservationUploadItem[]): Array<{ id: string; number: number; count: number }> {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!counts.has(item.groupId)) order.push(item.groupId);
    counts.set(item.groupId, (counts.get(item.groupId) ?? 0) + 1);
  }
  return order.map((id, index) => ({ id, number: index + 1, count: counts.get(id) ?? 0 }));
}

function sharedOccurrencePatch(patch: Partial<ObservationAnalysis>): Partial<ObservationAnalysis> {
  const { subjectPart: _subjectPart, caption: _caption, confidence: _confidence, ...shared } = patch;
  return shared;
}

function sharedOccurrenceAnalysis(analysis: ObservationAnalysis): Partial<ObservationAnalysis> {
  return sharedOccurrencePatch(analysis);
}

export function ObservationsClient({ target, initialPage }: { target: ManageTarget; initialPage: InitialPage }) {
  const t = useTranslations("upload.observations");
  const router = useRouter();
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringEnum<Mode>(["list", "add"]).withDefault("list").withOptions(QUERY_STATE_OPTIONS),
  );
  const createPermission = canCreateRecord(target);

  useEffect(() => {
    configureObservationMutationRepo(target.kind === "group" ? target.did : null);
    return () => configureObservationMutationRepo(null);
  }, [target]);

  if (mode === "add") {
    return (
      <ObservationBulkAddPanel
        target={target}
        disabledReason={createPermission.reason}
        onBack={() => {
          void setMode("list").then(() => router.refresh());
        }}
      />
    );
  }

  return (
    <div className="bg-background pb-4">
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <h1 className="font-instrument text-2xl font-medium italic tracking-[-0.03em] text-foreground sm:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("description")}</p>
          </div>
          {createPermission.allowed ? (
            <Button asChild>
              <Link href={manageHref(target, "observations", { mode: "add" })}>
                <ImagePlusIcon className="size-4" /> {t("addObservation")}
              </Link>
            </Button>
          ) : (
            <Button disabled title={createPermission.reason ?? undefined}>
              <ImagePlusIcon className="size-4" /> {t("addObservation")}
            </Button>
          )}
        </header>

        <div className="group relative mt-5 overflow-hidden rounded-3xl border border-dashed border-primary/20 bg-gradient-to-br from-primary/[0.07] via-accent/30 to-background p-5 sm:p-6">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div className="relative w-fit shrink-0">
              <div className="grid size-16 place-items-center overflow-visible rounded-2xl bg-gradient-to-br from-accent/70 to-primary/10 ring-1 ring-primary/15 transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-105 sm:size-20">
                <img
                  src={TAINA_SIM.posterUrl}
                  alt={TAINA_SIM.name}
                  width={80}
                  height={80}
                  loading="lazy"
                  className="h-[115%] w-[115%] -translate-y-2 object-contain sm:-translate-y-3"
                />
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 grid size-7 place-items-center rounded-full bg-[#229ED9] text-white ring-2 ring-background">
                <TelegramIcon className="size-3.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-instrument text-xl font-medium italic tracking-[-0.02em] text-foreground sm:text-2xl">
                  {t("tainaTitle")}
                </p>
                <Button asChild className="hidden sm:inline-flex sm:shrink-0">
                  <Link href={TAINA_BOT_URL} target="_blank" rel="noreferrer">
                    <TelegramIcon />
                    {t("tainaCta")}
                  </Link>
                </Button>
              </div>
              <p className="mt-1.5 max-w-prose text-sm leading-6 text-muted-foreground">{t("tainaBody")}</p>
              <Button asChild className="mt-4 w-full sm:hidden">
                <Link href={TAINA_BOT_URL} target="_blank" rel="noreferrer">
                  <TelegramIcon />
                  {t("tainaCta")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <RecordExplorer kind="occurrence" ownerDid={target.did} showHero={false} initialPage={initialPage} defaultOccurrenceMedia="all" />
      </Suspense>
    </div>
  );
}

function ObservationBulkAddPanel({
  disabledReason,
  onBack,
}: {
  target: ManageTarget;
  disabledReason?: string | null;
  onBack: () => void;
}) {
  const t = useTranslations("upload.observations");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<ObservationUploadItem[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  const itemsRef = useRef<ObservationUploadItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl);
    };
  }, []);

  const readySelectedItems = items.filter((item) => item.selected && itemCanUpload(item));
  const selectedEditableItems = items.filter((item) => item.selected && item.status !== "uploading" && item.status !== "uploaded");
  const uploadedCount = items.filter((item) => item.status === "uploaded").length;
  const uploadableCount = items.filter(itemCanUpload).length;
  const overallProgress = items.length > 0 ? Math.round((uploadedCount / items.length) * 100) : 0;
  const groupOptions = observationGroupOptions(items);

  async function analyzeItem(item: ObservationUploadItem) {
    try {
      const formData = new FormData();
      formData.set("image", item.file);
      const response = await fetch("/api/manage/observations/analyze", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as AnalyzeResponse;
      if (!response.ok || data.error) throw new Error(analysisErrorMessage(data.error, t));
      setItems((current) => current.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, status: "ready", analysis: normalizeAnalysis(data.analysis, item.file), error: null, selected: true }
          : candidate,
      ));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("analysisFailed");
      setItems((current) => current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, status: "error", error: message, selected: false } : candidate,
      ));
    }
  }

  async function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    setIsPreparing(true);
    try {
      const nextItems = await Promise.all(files.map(async (sourceFile) => {
        const id = `${sourceFile.name}-${sourceFile.size}-${sourceFile.lastModified}-${crypto.randomUUID()}`;
        try {
          const prepared = await compressImageIfNeeded(sourceFile);
          return {
            id,
            file: prepared.file,
            previewUrl: URL.createObjectURL(prepared.file),
            originalSize: prepared.originalSize,
            compressed: prepared.compressed,
            groupId: id,
            selected: false,
            status: "analyzing" as const,
            progress: 0,
            analysis: { ...EMPTY_ANALYSIS, eventDate: dateFromFile(sourceFile), caption: cleanFileName(sourceFile.name) },
            error: null,
            uploadedUri: null,
          };
        } catch {
          return {
            id,
            file: sourceFile,
            previewUrl: URL.createObjectURL(sourceFile),
            originalSize: sourceFile.size,
            compressed: false,
            groupId: id,
            selected: false,
            status: "error" as const,
            progress: 0,
            analysis: { ...EMPTY_ANALYSIS, eventDate: dateFromFile(sourceFile), caption: cleanFileName(sourceFile.name) },
            error: t("compressionFailed"),
            uploadedUri: null,
          };
        }
      }));
      setItems((current) => [...current, ...nextItems]);
      for (const item of nextItems) {
        if (item.status === "analyzing") void analyzeItem(item);
      }
    } finally {
      setIsPreparing(false);
    }
  }

  function onFilesChanged(event: ChangeEvent<HTMLInputElement>) {
    void addFiles(event.target.files);
    event.currentTarget.value = "";
  }

  function updateAnalysis(id: string, patch: Partial<ObservationAnalysis>) {
    setItems((current) => {
      const source = current.find((item) => item.id === id);
      const sharedPatch = sharedOccurrencePatch(patch);
      return current.map((item) => {
        if (item.id === id) return { ...item, analysis: { ...item.analysis, ...patch } };
        if (source && item.groupId === source.groupId && Object.keys(sharedPatch).length > 0) {
          return { ...item, analysis: { ...item.analysis, ...sharedPatch } };
        }
        return item;
      });
    });
  }

  function removeItem(id: string) {
    setItems((current) => {
      const item = current.find((candidate) => candidate.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((candidate) => candidate.id !== id);
    });
  }

  function groupSelected() {
    if (selectedEditableItems.length < 2) {
      setBulkError(t("selectTwoToGroup"));
      return;
    }
    const target = selectedEditableItems[0];
    const targetGroupId = target?.groupId;
    if (!target || !targetGroupId) return;
    const selectedIds = new Set(selectedEditableItems.map((item) => item.id));
    const shared = sharedOccurrenceAnalysis(target.analysis);
    setItems((current) => current.map((item) => selectedIds.has(item.id) ? { ...item, groupId: targetGroupId, analysis: { ...item.analysis, ...shared } } : item));
    setBulkError(null);
  }

  function ungroupSelected() {
    const selectedIds = new Set(selectedEditableItems.map((item) => item.id));
    setItems((current) => current.map((item) => selectedIds.has(item.id) ? { ...item, groupId: item.id } : item));
    setBulkError(null);
  }

  function updateGroup(itemId: string, groupId: string) {
    setItems((current) => {
      const targetGroupItem = current.find((item) => item.groupId === groupId);
      const shared = targetGroupItem ? sharedOccurrenceAnalysis(targetGroupItem.analysis) : null;
      return current.map((item) => item.id === itemId ? { ...item, groupId, analysis: shared ? { ...item.analysis, ...shared } : item.analysis } : item);
    });
  }

  async function uploadGroup(groupId: string, itemIds?: Set<string>) {
    const snapshot = itemsRef.current;
    const groupItems = snapshot.filter((item) => item.groupId === groupId && (!itemIds || itemIds.has(item.id)));
    const uploadItems = groupItems.filter(itemCanUpload);
    if (uploadItems.length === 0 || disabledReason) {
      if (disabledReason) setBulkError(disabledReason);
      return;
    }

    const uploadIds = new Set(uploadItems.map((item) => item.id));
    setBulkError(null);
    try {
      setItems((current) => current.map((candidate) => uploadIds.has(candidate.id) ? { ...candidate, status: "uploading", progress: 15, error: null } : candidate));
      const primary = uploadItems[0];
      const existingOccurrenceUri = snapshot.find((item) => item.groupId === groupId && item.uploadedUri)?.uploadedUri ?? null;
      let occurrenceUri = existingOccurrenceUri;
      if (!occurrenceUri) {
        const data = primary.analysis;
        const occurrence = await createObservationOccurrence({
          basisOfRecord: "MachineObservation",
          scientificName: data.scientificName.trim(),
          vernacularName: data.vernacularName.trim(),
          kingdom: data.kingdom.trim(),
          eventDate: data.eventDate.trim(),
          recordedBy: data.recordedBy.trim(),
          decimalLatitude: data.decimalLatitude.trim(),
          decimalLongitude: data.decimalLongitude.trim(),
          country: data.country.trim(),
          locality: data.locality.trim(),
          habitat: data.habitat.trim(),
          occurrenceRemarks: data.occurrenceRemarks.trim(),
          associatedMedia: uploadItems.map((item) => item.file.name).join(", "),
        });
        occurrenceUri = occurrence.uri;
      }
      if (!occurrenceUri) throw new Error(t("analysisFailed"));

      for (const item of uploadItems) {
        setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, progress: 60 } : candidate));
        await createObservationPhoto({
          imageFile: item.file,
          occurrenceRef: occurrenceUri,
          subjectPart: item.analysis.subjectPart.trim() || "wholeOrganism",
          caption: item.analysis.caption.trim() || undefined,
        });
        setItems((current) => current.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, status: "uploaded", progress: 100, selected: false, uploadedUri: occurrenceUri, error: null }
            : candidate,
        ));
      }
    } catch (error) {
      const message = formatObservationMutationError(error);
      setItems((current) => current.map((candidate) =>
        uploadIds.has(candidate.id) && candidate.status === "uploading"
          ? { ...candidate, status: "uploadError", progress: 0, error: message }
          : candidate,
      ));
    }
  }

  async function uploadSelected() {
    if (readySelectedItems.length === 0) {
      setBulkError(t("noReadySelected"));
      return;
    }
    setIsBulkUploading(true);
    try {
      const selectedIds = new Set(readySelectedItems.map((item) => item.id));
      const groupIds = Array.from(new Set(readySelectedItems.map((item) => item.groupId)));
      for (const groupId of groupIds) {
        await uploadGroup(groupId, selectedIds);
      }
    } finally {
      setIsBulkUploading(false);
    }
  }

  return (
    <Container className="space-y-6 pt-4 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="-ml-2 mb-2">
            <ChevronLeftIcon className="size-4" /> {t("backToObservations")}
          </Button>
          <h1 className="font-instrument text-2xl font-medium italic tracking-[-0.03em] text-foreground sm:text-3xl">
            {t("bulkTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("bulkIntro")}</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFilesChanged} className="sr-only" />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPreparing}>
            {isPreparing ? <Loader2Icon className="size-4 animate-spin" /> : <ImagePlusIcon className="size-4" />}
            {isPreparing ? t("preparingImages") : items.length > 0 ? t("chooseMoreImages") : t("chooseImages")}
          </Button>
          <Button onClick={() => void uploadSelected()} disabled={isBulkUploading || readySelectedItems.length === 0 || Boolean(disabledReason)} title={disabledReason ?? undefined}>
            {isBulkUploading ? <Loader2Icon className="size-4 animate-spin" /> : <UploadCloudIcon className="size-4" />}
            {isBulkUploading ? t("uploadingSelected") : t("uploadSelected")}
          </Button>
        </div>
      </div>

      {bulkError || disabledReason ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {bulkError ?? disabledReason}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("fileRequirements")}</span>
          <span>{t("uploadedCount", { uploaded: uploadedCount, total: items.length })}</span>
        </div>
        {items.length > 0 ? (
          <div className="mt-3 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">{t("groupingHelp")}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={groupSelected} disabled={selectedEditableItems.length < 2}>
                {t("groupSelected")}
              </Button>
              <Button variant="ghost" size="sm" onClick={ungroupSelected} disabled={selectedEditableItems.length === 0}>
                {t("ungroupSelected")}
              </Button>
            </div>
          </div>
        ) : null}
        {items.length > 0 ? <ProgressBar value={overallProgress} label={t("progressLabel", { progress: overallProgress })} className="mt-3" /> : null}
      </div>

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-primary/30 bg-primary/[0.03] p-8 text-center transition hover:bg-primary/[0.06]"
        >
          <ImagePlusIcon className="mb-4 size-10 text-primary" />
          <span className="font-instrument text-2xl font-medium italic">{t("emptyUploadTitle")}</span>
          <span className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("emptyUploadDescription")}</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">{t("listTitle")}</h2>
            <span className="text-sm text-muted-foreground">{t("selectedCount", { selected: readySelectedItems.length, total: uploadableCount })}</span>
          </div>
          {items.map((item) => (
            <ObservationListItem
              key={item.id}
              item={item}
              groupOptions={groupOptions}
              disabledReason={disabledReason}
              onAnalysisChange={updateAnalysis}
              onGroupChange={(groupId) => updateGroup(item.id, groupId)}
              onToggleSelected={(checked) => setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, selected: checked } : candidate))}
              onUpload={() => void uploadGroup(item.groupId)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}
    </Container>
  );
}

function ObservationListItem({
  item,
  groupOptions,
  disabledReason,
  onAnalysisChange,
  onGroupChange,
  onToggleSelected,
  onUpload,
  onRemove,
}: {
  item: ObservationUploadItem;
  groupOptions: Array<{ id: string; number: number; count: number }>;
  disabledReason?: string | null;
  onAnalysisChange: (id: string, patch: Partial<ObservationAnalysis>) => void;
  onGroupChange: (groupId: string) => void;
  onToggleSelected: (checked: boolean) => void;
  onUpload: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("upload.observations");
  const canUpload = itemCanUpload(item) && !disabledReason;
  const showAnalysis = item.status === "ready" || item.status === "uploading" || item.status === "uploaded" || item.status === "uploadError";
  const currentGroup = groupOptions.find((group) => group.id === item.groupId);
  const groupedCount = currentGroup?.count ?? 1;
  const groupLabel = currentGroup ? t("groupName", { number: currentGroup.number }) : t("newObservationGroup");
  const groupingDisabled = item.status === "uploading" || item.status === "uploaded";
  return (
    <article className="rounded-2xl border bg-background p-3 transition hover:border-primary/40">
      <div className="flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
          <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium">{item.analysis.scientificName || cleanFileName(item.file.name)}</h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {item.file.name} · {formatBytes(item.file.size)}
                {item.compressed ? ` · ${t("compressedFrom", { size: formatBytes(item.originalSize) })}` : ""}
              </p>
            </div>
            <button type="button" onClick={onRemove} aria-label={t("removeImage")} className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={item.selected} disabled={!itemCanUpload(item)} onCheckedChange={(value) => onToggleSelected(value === true)} aria-label={t("selectForUpload")} />
              {t("selectForUpload")}
            </label>
            <StatusPill status={item.status} />
            {groupedCount > 1 ? <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{groupLabel} · {groupedCount}</span> : null}
          </div>
          {item.status === "uploading" ? <ProgressBar value={item.progress} label={t("progressLabel", { progress: item.progress })} className="mt-3" /> : null}
          {item.error ? <p className="mt-2 text-xs text-destructive">{item.error}</p> : null}
        </div>
      </div>

      {showAnalysis ? (
        <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-instrument text-lg font-medium italic tracking-[-0.02em]">{t("analysisPanelTitle")}</h4>
              {item.analysis.confidence !== null ? (
                <p className="mt-1 text-xs text-muted-foreground">{t("aiConfidence", { confidence: Math.round(item.analysis.confidence * 100) })}</p>
              ) : null}
            </div>
            {item.status === "ready" || item.status === "uploadError" ? (
              <Button size="sm" disabled={!canUpload} title={disabledReason ?? undefined} onClick={onUpload}>
                <UploadCloudIcon className="size-4" /> {groupedCount > 1 ? t("uploadGroup") : t("uploadOne")}
              </Button>
            ) : null}
          </div>
          <div className="mb-4 grid gap-3 rounded-xl bg-background/70 p-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">{t("groupControlLabel")}</span>
              <select
                value={item.groupId}
                disabled={groupingDisabled}
                onChange={(event) => onGroupChange(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value={item.id}>{item.groupId === item.id ? groupLabel : t("newObservationGroup")}</option>
                {groupOptions.filter((group) => group.id !== item.id).map((group) => (
                  <option key={group.id} value={group.id}>
                    {t("groupName", { number: group.number })} · {group.count}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs leading-5 text-muted-foreground">{t("groupItemHelp")}</p>
          </div>
          <ObservationAnalysisFields item={item} onChange={(patch) => onAnalysisChange(item.id, patch)} />
        </div>
      ) : null}
    </article>
  );
}

function StatusPill({ status }: { status: ItemStatus }) {
  const t = useTranslations("upload.observations.status");
  const className = status === "uploaded"
    ? "bg-primary/10 text-primary"
    : status === "error" || status === "uploadError"
      ? "bg-destructive/10 text-destructive"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${className}`}>
      {status === "analyzing" || status === "uploading" ? <Loader2Icon className="size-3 animate-spin" /> : null}
      {status === "uploaded" ? <CheckCircle2Icon className="size-3" /> : null}
      {t(status)}
    </span>
  );
}

function ObservationAnalysisFields({ item, onChange }: { item: ObservationUploadItem; onChange: (patch: Partial<ObservationAnalysis>) => void }) {
  const t = useTranslations("upload.observations");
  const disabled = item.status === "uploading" || item.status === "uploaded";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label={t("fields.scientificName")} value={item.analysis.scientificName} disabled={disabled} onChange={(value) => onChange({ scientificName: value })} required />
        <Field label={t("fields.commonName")} value={item.analysis.vernacularName} disabled={disabled} onChange={(value) => onChange({ vernacularName: value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("fields.eventDate")} type="date" value={item.analysis.eventDate} disabled={disabled} onChange={(value) => onChange({ eventDate: value })} required />
        <Field label={t("fields.kingdom")} value={item.analysis.kingdom} disabled={disabled} onChange={(value) => onChange({ kingdom: value })} />
        <Field label={t("fields.latitude")} value={item.analysis.decimalLatitude} disabled={disabled} onChange={(value) => onChange({ decimalLatitude: value })} />
        <Field label={t("fields.longitude")} value={item.analysis.decimalLongitude} disabled={disabled} onChange={(value) => onChange({ decimalLongitude: value })} />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Field label={t("fields.recordedBy")} value={item.analysis.recordedBy} disabled={disabled} onChange={(value) => onChange({ recordedBy: value })} />
        <Field label={t("fields.country")} value={item.analysis.country} disabled={disabled} onChange={(value) => onChange({ country: value })} />
        <Field label={t("fields.locality")} value={item.analysis.locality} disabled={disabled} onChange={(value) => onChange({ locality: value })} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label={t("fields.subjectPart")} value={item.analysis.subjectPart} disabled={disabled} onChange={(value) => onChange({ subjectPart: value })} />
        <TextareaField label={t("fields.caption")} value={item.analysis.caption} disabled={disabled} onChange={(value) => onChange({ caption: value })} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <TextareaField label={t("fields.habitat")} value={item.analysis.habitat} disabled={disabled} onChange={(value) => onChange({ habitat: value })} />
        <TextareaField label={t("fields.remarks")} value={item.analysis.occurrenceRemarks} disabled={disabled} onChange={(value) => onChange({ occurrenceRemarks: value })} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", disabled, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean; required?: boolean }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}{required ? " *" : ""}</span>
      <Input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextareaField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Textarea value={value} disabled={disabled} rows={3} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div className={className} aria-label={label} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={bounded}>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${bounded}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
