"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUSES,
  STATUS_TONES,
  categoryIcon,
  createEquipment,
  deleteEquipment,
  listEquipmentAcross,
  updateEquipment,
  type EquipmentCategory,
  type EquipmentDraft,
  type EquipmentItem,
  type EquipmentStatus,
  type EquipmentStatusTone,
} from "@/app/_lib/equipment";
import { monogram, resolveDidProfile, type DidProfile } from "@/app/_lib/did-profile";
import { formatRelative, shortDid } from "@/app/_lib/format";
import { accountEquipmentPath } from "../_lib/account-route";

const TONE_BADGE: Record<EquipmentStatusTone, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  down: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

type Editor = { mode: "new" } | { mode: "edit"; item: EquipmentItem };

export type EquipmentSectionProps = {
  /** Repos to read equipment from (one for a personal profile, the whole team for an organization). */
  repos: string[];
  /** Signed-in viewer's DID; rows in their repo become editable. */
  viewerDid: string | null;
  /** Whether the viewer may add new units (writes to their own repo). */
  canAdd: boolean;
  variant: "personal" | "organization";
  /** Organization tab only: the team list could not be fully resolved. */
  membersUnavailable?: boolean;
};

export function EquipmentSection({
  repos,
  viewerDid,
  canAdd,
  variant,
  membersUnavailable = false,
}: EquipmentSectionProps) {
  const t = useTranslations("common.equipment");
  const isOrg = variant === "organization";

  const [items, setItems] = useState<EquipmentItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "all">("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");

  const reposKey = [...new Set(repos)].sort().join(",");
  const profiles = useDidProfiles(items, isOrg);

  const reload = useCallback(async (signal?: AbortSignal) => {
    setLoadError(false);
    try {
      const list = await listEquipmentAcross(reposKey ? reposKey.split(",") : [], {
        signal,
        onProgress: (running) => {
          if (!signal?.aborted) setItems(running);
        },
      });
      if (!signal?.aborted) setItems(list);
    } catch (err) {
      if (signal?.aborted || (err as Error).name === "AbortError") return;
      setItems([]);
      setLoadError(true);
    }
  }, [reposKey]);

  useEffect(() => {
    const ctrl = new AbortController();
    setItems(null);
    reload(ctrl.signal);
    return () => ctrl.abort();
  }, [reload]);

  // Distinct repo owners (team members), for the member filter on org tabs.
  const owners = useMemo(() => {
    if (!isOrg) return [];
    const counts = new Map<string, number>();
    for (const it of items ?? []) counts.set(it.did, (counts.get(it.did) ?? 0) + 1);
    return [...counts.entries()]
      .map(([did, count]) => ({ did, count, label: ownerLabel(did, profiles[did]) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items, profiles, isOrg]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (memberFilter !== "all" && it.did !== memberFilter) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.assetId.toLowerCase().includes(q) ||
        (it.currentOwner ?? "").toLowerCase().includes(q) ||
        (it.projectSite ?? "").toLowerCase().includes(q) ||
        (isOrg && ownerLabel(it.did, profiles[it.did]).toLowerCase().includes(q))
      );
    });
  }, [items, query, categoryFilter, statusFilter, memberFilter, profiles, isOrg]);

  const hasItems = (items?.length ?? 0) > 0;

  return (
    <section className="mt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-prose text-sm text-muted-foreground">
          {isOrg ? t("orgIntro") : t("personalIntro")}
        </p>
        {canAdd ? (
          <Button size="sm" onClick={() => setEditor({ mode: "new" })} className="shrink-0">
            <PlusIcon />
            {t("addEquipment")}
          </Button>
        ) : null}
      </div>

      {membersUnavailable ? (
        <p className="mt-3 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          {t("membersUnavailable")}
        </p>
      ) : null}

      {hasItems ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="sm:max-w-[240px]"
          />
          <div className="flex flex-wrap gap-2">
            {isOrg && owners.length > 1 ? (
              <FilterSelect
                value={memberFilter}
                onChange={setMemberFilter}
                ariaLabel={t("table.member")}
                options={[
                  { value: "all", label: t("allMembers") },
                  ...owners.map((o) => ({ value: o.did, label: `${o.label} (${o.count})` })),
                ]}
              />
            ) : null}
            <FilterSelect
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(v as EquipmentCategory | "all")}
              ariaLabel={t("table.type")}
              options={[
                { value: "all", label: t("allTypes") },
                ...EQUIPMENT_CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) })),
              ]}
            />
            <FilterSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as EquipmentStatus | "all")}
              ariaLabel={t("table.status")}
              options={[
                { value: "all", label: t("anyStatus") },
                ...EQUIPMENT_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) })),
              ]}
            />
          </div>
        </div>
      ) : null}

      {items === null ? (
        <LoadingRows />
      ) : loadError ? (
        <Notice title={t("loadErrorTitle")} body={t("loadError")} />
      ) : items.length === 0 ? (
        canAdd ? (
          <Notice title={t("emptyTitleOwner")} body={t("emptyBodyOwner")} />
        ) : (
          <Notice title={t("emptyTitle")} body={isOrg ? t("emptyBodyOrg") : t("emptyBodyPersonal")} />
        )
      ) : filtered.length === 0 ? (
        <Notice title={t("emptyTitle")} body={t("noMatches")} />
      ) : (
        <>
          <EquipmentTable
            rows={filtered}
            profiles={profiles}
            viewerDid={viewerDid}
            showMember={isOrg}
            onEdit={(item) => setEditor({ mode: "edit", item })}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {filtered.length === items.length
              ? t("unitCount", { count: items.length })
              : t("showingFiltered", { shown: filtered.length, total: items.length })}
          </p>
        </>
      )}

      {editor ? (
        <EquipmentEditor
          editor={editor}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await reload();
          }}
        />
      ) : null}
    </section>
  );
}

// ── Owner profile resolution (org tab) ──────────────────────────────────────

function useDidProfiles(items: EquipmentItem[] | null, enabled: boolean): Record<string, DidProfile> {
  const [profiles, setProfiles] = useState<Record<string, DidProfile>>({});
  const key = enabled && items ? [...new Set(items.map((it) => it.did))].sort().join(",") : "";
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    for (const did of key.split(",")) {
      resolveDidProfile(did)
        .then((p) => {
          if (!cancelled) setProfiles((prev) => (prev[did] ? prev : { ...prev, [did]: p }));
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [key]);
  return profiles;
}

function ownerLabel(did: string, profile?: DidProfile): string {
  return profile?.displayName || profile?.handle || shortDid(did);
}

// ── Table ────────────────────────────────────────────────────────────────────

function EquipmentTable({
  rows,
  profiles,
  viewerDid,
  showMember,
  onEdit,
}: {
  rows: EquipmentItem[];
  profiles: Record<string, DidProfile>;
  viewerDid: string | null;
  showMember: boolean;
  onEdit: (item: EquipmentItem) => void;
}) {
  const t = useTranslations("common.equipment");
  const anyEditable = viewerDid !== null && rows.some((it) => it.did === viewerDid);

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5">{t("table.equipment")}</th>
            <th className="px-3 py-2.5">{t("table.type")}</th>
            <th className="px-3 py-2.5">{t("table.status")}</th>
            <th className="px-3 py-2.5">{t("table.holder")}</th>
            <th className="px-3 py-2.5">{t("table.site")}</th>
            {showMember ? <th className="px-3 py-2.5">{t("table.member")}</th> : null}
            <th className="px-3 py-2.5 text-right">{t("table.updated")}</th>
            {anyEditable ? <th className="w-[1%] px-3 py-2.5" aria-label={t("edit")} /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((it) => {
            const mine = viewerDid !== null && it.did === viewerDid;
            return (
              <tr key={it.uri} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30">
                <td className="px-3 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-base">
                      {categoryIcon(it.category)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{it.name}</div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {it.assetId || t("table.noId")}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-foreground/80">
                  {t(`categories.${it.category}`)}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      TONE_BADGE[STATUS_TONES[it.status]],
                    )}
                  >
                    {t(`statuses.${it.status}`)}
                  </span>
                </td>
                <td className="max-w-[160px] truncate px-3 py-3 text-sm text-foreground/80">
                  {it.currentOwner ?? "—"}
                </td>
                <td className="max-w-[180px] truncate px-3 py-3 text-sm text-foreground/80">
                  {it.projectSite ?? "—"}
                </td>
                {showMember ? (
                  <td className="px-3 py-3">
                    <MemberBadge did={it.did} profile={profiles[it.did]} mine={mine} youLabel={t("you")} />
                  </td>
                ) : null}
                <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-muted-foreground">
                  {formatRelative(it.updatedAt)}
                </td>
                {anyEditable ? (
                  <td className="px-3 py-3 text-right">
                    {mine ? (
                      <Button variant="outline" size="xs" onClick={() => onEdit(it)}>
                        {t("edit")}
                      </Button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MemberBadge({
  did,
  profile,
  mine,
  youLabel,
}: {
  did: string;
  profile?: DidProfile;
  mine: boolean;
  youLabel: string;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const m = monogram(profile?.handle ?? null, did);
  const avatar = (!avatarFailed && profile?.avatar) || null;
  return (
    <Link href={accountEquipmentPath(did)} className="group inline-flex max-w-[180px] items-center gap-2">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary PDS/CDN hosts
        <img
          src={avatar}
          alt=""
          onError={() => setAvatarFailed(true)}
          className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-border"
        />
      ) : (
        <span
          aria-hidden
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white/95"
          style={{ backgroundColor: m.bg }}
        >
          {m.char}
        </span>
      )}
      <span className="truncate text-xs text-foreground/80 group-hover:underline">
        {ownerLabel(did, profile)}
      </span>
      {mine ? (
        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
          {youLabel}
        </span>
      ) : null}
    </Link>
  );
}

// ── Editor panel ────────────────────────────────────────────────────────────

function blankDraft(): EquipmentDraft {
  return {
    assetId: "",
    name: "",
    category: "audiomoth",
    status: "storage",
    currentOwner: "",
    projectSite: "",
    acquiredAt: "",
    notes: "",
  };
}

function itemToDraft(item: EquipmentItem): EquipmentDraft {
  return {
    assetId: item.assetId,
    name: item.name,
    category: item.category,
    status: item.status,
    currentOwner: item.currentOwner ?? "",
    projectSite: item.projectSite ?? "",
    acquiredAt: item.acquiredAt ?? "",
    notes: item.notes ?? "",
    geo: item.geo ?? null,
  };
}

function EquipmentEditor({
  editor,
  onClose,
  onSaved,
}: {
  editor: Editor;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const t = useTranslations("common.equipment");
  const isEdit = editor.mode === "edit";
  const [draft, setDraft] = useState<EquipmentDraft>(isEdit ? itemToDraft(editor.item) : blankDraft());
  const [lat, setLat] = useState(isEdit && editor.item.geo ? String(editor.item.geo.lat) : "");
  const [lon, setLon] = useState(isEdit && editor.item.geo ? String(editor.item.geo.lon) : "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = saving || deleting;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
    };
  }, [onClose, busy]);

  const patch = (p: Partial<EquipmentDraft>) => setDraft((d) => ({ ...d, ...p }));

  function buildGeo(): EquipmentDraft["geo"] {
    const la = lat.trim();
    const lo = lon.trim();
    if (!la && !lo) return null;
    const latN = Number(la);
    const lonN = Number(lo);
    if (!Number.isFinite(latN) || !Number.isFinite(lonN)) {
      throw new Error(t("errors.invalidCoordinates"));
    }
    if (latN < -90 || latN > 90 || lonN < -180 || lonN > 180) {
      throw new Error(t("errors.coordinatesRange"));
    }
    return { lat: latN, lon: lonN };
  }

  async function save() {
    setError(null);
    if (!draft.assetId.trim() && !draft.name.trim()) {
      setError(t("errors.needIdOrName"));
      return;
    }
    let geo: EquipmentDraft["geo"];
    try {
      geo = buildGeo();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.invalidCoordinates"));
      return;
    }
    setSaving(true);
    try {
      const payload: EquipmentDraft = { ...draft, geo };
      if (isEdit) await updateEquipment(editor.item, payload);
      else await createEquipment(payload);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("errors.saveFailed"));
      setSaving(false);
    }
  }

  async function remove() {
    if (!isEdit) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteEquipment(editor.item);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("errors.deleteFailed"));
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div className="relative flex h-full w-full max-w-[460px] flex-col overflow-y-auto bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-5 py-4 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? t("editEquipment") : t("addEquipment")}
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => !busy && onClose()}
            aria-label={t("form.close")}
          >
            <XIcon />
          </Button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("form.name")}>
              <Input
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={t("form.namePlaceholder")}
              />
            </Field>
            <Field label={t("form.assetId")}>
              <Input
                value={draft.assetId}
                onChange={(e) => patch({ assetId: e.target.value })}
                className="font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("form.type")}>
              <NativeSelect
                value={draft.category}
                onChange={(v) => patch({ category: v as EquipmentCategory })}
                options={EQUIPMENT_CATEGORIES.map((c) => ({
                  value: c,
                  label: `${categoryIcon(c)} ${t(`categories.${c}`)}`,
                }))}
              />
            </Field>
            <Field label={t("form.status")}>
              <NativeSelect
                value={draft.status}
                onChange={(v) => patch({ status: v as EquipmentStatus })}
                options={EQUIPMENT_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) }))}
              />
            </Field>
          </div>

          <Field label={t("form.holder")}>
            <Input
              value={draft.currentOwner ?? ""}
              onChange={(e) => patch({ currentOwner: e.target.value })}
              placeholder={t("form.holderPlaceholder")}
            />
          </Field>
          <Field label={t("form.site")}>
            <Input
              value={draft.projectSite ?? ""}
              onChange={(e) => patch({ projectSite: e.target.value })}
              placeholder={t("form.sitePlaceholder")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("form.latitude")}>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-1.234" className="font-mono" />
            </Field>
            <Field label={t("form.longitude")}>
              <Input value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-77.891" className="font-mono" />
            </Field>
          </div>

          <Field label={t("form.acquired")}>
            <Input type="date" value={draft.acquiredAt ?? ""} onChange={(e) => patch({ acquiredAt: e.target.value })} />
          </Field>

          <Field label={t("form.notes")}>
            <textarea
              value={draft.notes ?? ""}
              onChange={(e) => patch({ notes: e.target.value })}
              rows={3}
              placeholder={t("form.notesPlaceholder")}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            />
          </Field>

          {error ? (
            <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur-xl">
          {isEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" onClick={remove} disabled={busy}>
                  {deleting ? <Loader2Icon className="animate-spin" /> : null}
                  {deleting ? t("form.deleting") : t("form.confirmDelete")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  {t("form.cancel")}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                {t("form.delete")}
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => !busy && onClose()} disabled={busy}>
              {t("form.cancel")}
            </Button>
            <Button size="sm" onClick={save} disabled={busy}>
              {saving ? <Loader2Icon className="animate-spin" /> : null}
              {saving ? t("form.saving") : isEdit ? t("form.save") : t("form.add")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small building blocks ───────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={cn(
        "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] dark:bg-input/30",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <NativeSelect
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      className="w-auto max-w-[200px]"
    />
  );
}

function LoadingRows() {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5 last:border-0">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[420px] text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
