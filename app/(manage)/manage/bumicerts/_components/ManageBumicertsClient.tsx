"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightIcon,
  CirclePlusIcon,
  ClockIcon,
  ExternalLinkIcon,
  FilePenLineIcon,
  HelpCircleIcon,
  LeafIcon,
  Loader2Icon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BumicertCardSkeleton, BumicertCardVisual } from "@/components/bumicert/BumicertCard";
import type { BumicertRecord } from "@/app/_lib/indexer";
import { localBumicertHref } from "@/app/_lib/urls";
import { cn } from "@/lib/utils";

type DraftValues = {
  title?: string;
  shortDescription?: string;
  description?: string;
  scopes?: string[];
  customScope?: string;
  startDate?: string;
  endDate?: string;
  contributors?: string[];
  selectedLocationUris?: string[];
};

type LocalDraft = {
  id: string;
  updatedAt: string;
  values: DraftValues;
};

type CreateTab = "recent" | "drafts";

const DRAFT_STORAGE_KEY = "bumicerts:create-drafts:v1";
const tabs: CreateTab[] = ["recent", "drafts"];

const tabPanelIds: Record<CreateTab, string> = {
  recent: "create-bumicert-recent-panel",
  drafts: "create-bumicert-drafts-panel",
};

const tabButtonIds: Record<CreateTab, string> = {
  recent: "create-bumicert-recent-tab",
  drafts: "create-bumicert-drafts-tab",
};

function readDrafts(): LocalDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalDraft[]).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: LocalDraft[]) {
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts.slice(0, 12)));
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function draftProgress(values: DraftValues): number {
  const filled = [
    values.title,
    values.startDate,
    values.endDate,
    values.scopes?.length,
    values.shortDescription,
    values.description,
    values.contributors?.filter(Boolean).length,
    values.selectedLocationUris?.length,
  ].filter((item) => item !== undefined && item !== null && item !== "" && item !== 0).length;
  return Math.round((filled / 8) * 100);
}

function CreateHeroCard() {
  return (
    <section className="relative overflow-visible rounded-[1.6rem] border border-border/80 bg-card shadow-sm">
      <div className="relative min-h-[17.5rem] overflow-hidden rounded-[1.55rem]">
        <Image
          src="/assets/media/images/create-bumicert/hero-light.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 720px, 100vw"
          className="object-cover object-center dark:hidden"
        />
        <Image
          src="/assets/media/images/create-bumicert/hero-dark.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 720px, 100vw"
          className="hidden object-cover object-center dark:block"
        />
        <div className="absolute inset-0 bg-linear-to-r from-background/95 via-background/72 to-background/5 dark:from-background/90 dark:via-background/58 dark:to-background/10" />
        <div className="absolute -top-8 right-[7%] h-28 w-52 rounded-full bg-background/50 blur-2xl dark:bg-primary/10" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-foreground/20 via-foreground/5 to-transparent dark:from-black/55" />

        <div className="relative z-10 flex min-h-[17.5rem] max-w-[29rem] flex-col justify-center px-6 py-8 sm:px-8 lg:px-9">
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-background/90 text-primary shadow-sm backdrop-blur-sm">
            <LeafIcon className="size-6" />
          </div>
          <h1 className="font-serif text-4xl font-medium leading-[0.98] tracking-[-0.03em] text-foreground sm:text-5xl">
            Create a<br />Bumicert
          </h1>
          <p className="mt-5 max-w-[25rem] text-base leading-7 text-muted-foreground">
            Turn verified conservation, restoration, and community stewardship work into a shareable impact certificate.
          </p>
          <div className="mt-7">
            <Button asChild>
              <Link href="/bumicert/create">
                <CirclePlusIcon />
                Create Bumicert
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <Image
        src="/assets/media/images/create-bumicert/plant-light.png"
        alt=""
        width={1002}
        height={1146}
        priority
        className="pointer-events-none absolute bottom-0 right-[4%] z-20 hidden h-[28rem] w-auto max-w-[58%] object-contain dark:hidden md:block"
      />
      <Image
        src="/assets/media/images/create-bumicert/plant-dark.png"
        alt=""
        width={964}
        height={1129}
        priority
        className="pointer-events-none absolute bottom-0 right-[4%] z-20 hidden h-[28rem] w-auto max-w-[58%] object-contain dark:md:block"
      />
    </section>
  );
}

function ExplainerCard() {
  return (
    <aside className="rounded-[1.6rem] border border-border/80 bg-card/75 p-7 shadow-sm backdrop-blur-sm lg:min-h-[17.5rem]">
      <div className="mb-8 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <HelpCircleIcon className="size-5" />
      </div>
      <h2 className="font-serif text-3xl font-medium leading-tight tracking-[-0.02em] text-foreground">
        What is a Bumicert?
      </h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-muted-foreground">
        <p>
          Bumicerts are public impact claims that connect a project story to people, places, time periods, and supporting evidence.
        </p>
        <p>
          Use them to make field work easier to review, share, and fund while keeping the underlying records discoverable.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild className="mt-5">
        <Link href="https://docs.fund.gainforest.app/" target="_blank" rel="noreferrer">
          Learn more
          <ExternalLinkIcon />
        </Link>
      </Button>
    </aside>
  );
}

function RecentBumicerts({ bumicerts, did }: { bumicerts: BumicertRecord[]; did: string }) {
  return (
    <div className="pt-6">
      <AnimatePresence mode="wait">
        {bumicerts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex min-h-[18rem] flex-col items-center justify-center px-6 text-center"
          >
            <div className="relative mb-4 flex size-24 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
              <div className="absolute -bottom-5 left-1/2 h-16 w-28 -translate-x-1/2 rounded-[50%] bg-primary/15" />
              <div className="absolute -bottom-7 left-[42%] h-14 w-24 -translate-x-1/2 rounded-[50%] bg-primary/10" />
              <LeafIcon className="relative z-10 size-9" />
            </div>
            <div className="space-y-2">
              <p className="font-serif text-2xl font-medium leading-tight tracking-[-0.02em] text-foreground">
                No Bumicerts yet
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Your published Bumicerts will appear here.
                <br />Create your first one when you are ready.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="mt-5">
              <Link href="/bumicert/create">
                <CirclePlusIcon />
                Create first Bumicert
              </Link>
            </Button>
          </motion.div>
        ) : (
          <div key="grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {bumicerts.map((bumicert) => (
              <motion.div
                key={bumicert.id}
                className="h-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Link href={localBumicertHref(bumicert.did || did, bumicert.rkey)} className="block h-full">
                  <BumicertCardVisual
                    coverImage={bumicert.imageUrl}
                    logoUrl={null}
                    title={bumicert.title}
                    organizationName={bumicert.did || did}
                    objectives={[
                      bumicert.locationCount > 0 ? `${bumicert.locationCount} ${bumicert.locationCount === 1 ? "site" : "sites"}` : "",
                      bumicert.contributorCount > 0 ? `${bumicert.contributorCount} ${bumicert.contributorCount === 1 ? "contributor" : "contributors"}` : "",
                      bumicert.startDate || bumicert.endDate ? "impact period" : "",
                    ].filter(Boolean)}
                    description={bumicert.shortDescription ?? undefined}
                    className="h-full"
                  />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DraftStatus({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center px-6 text-center text-muted-foreground">
      <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="font-serif text-2xl font-medium tracking-[-0.02em] text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6">{description}</p>
    </div>
  );
}

function DraftBumicerts() {
  const [drafts, setDrafts] = useState<LocalDraft[] | null>(null);

  useEffect(() => {
    setDrafts(readDrafts());
  }, []);

  if (drafts === null) {
    return <DraftStatus icon={<Loader2Icon className="size-8 animate-spin" />} title="Loading drafts" description="Checking your saved drafts…" />;
  }

  if (drafts.length === 0) {
    return <DraftStatus icon={<FilePenLineIcon className="size-8" />} title="No drafts yet" description="Drafts you save during the creation flow will appear here." />;
  }

  function handleDelete(id: string) {
    setDrafts((current) => {
      const next = (current ?? []).filter((draft) => draft.id !== id);
      writeDrafts(next);
      return next;
    });
  }

  return (
    <div className="grid w-full grid-cols-1 gap-3 pt-6 sm:grid-cols-2 xl:grid-cols-4">
      {drafts.map((draft) => {
        const title = draft.values.title?.trim() || "Untitled draft";
        const progress = draftProgress(draft.values);
        return (
          <div key={draft.id} className="flex w-full items-center rounded-2xl border border-border/80 bg-card/70 p-3 shadow-sm transition-colors hover:bg-muted/40">
            <div className="relative flex size-[42px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {progress}%
            </div>
            <div className="ml-3 flex min-w-0 flex-1 flex-col">
              <h3 className="truncate font-medium text-foreground">{title}</h3>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <ClockIcon className="size-3" />
                {formatTime(draft.updatedAt)}
              </p>
            </div>
            <div className="ml-2 flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon-sm" className="rounded-full text-destructive hover:text-destructive" aria-label={`Delete ${title}`} onClick={() => handleDelete(draft.id)}>
                <Trash2Icon />
              </Button>
              <Button variant="outline" size="icon-sm" className="rounded-full" asChild>
                <Link href="/bumicert/create">
                  <ArrowRightIcon />
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CreateBumicertTabs({ bumicerts, did }: { bumicerts: BumicertRecord[]; did: string }) {
  const [activeTab, setActiveTab] = useState<CreateTab>("recent");

  return (
    <section className="pt-2">
      <div role="tablist" aria-label="Bumicert create sections" className="flex items-end gap-8 border-b border-border/80 px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              id={tabButtonIds[tab]}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={tabPanelIds[tab]}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative -mb-px px-4 pb-4 pt-2 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
              {isActive && (
                <motion.span
                  layoutId="create-bumicert-active-tab"
                  className="absolute inset-x-0 bottom-0 h-px bg-primary"
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div id={tabPanelIds[activeTab]} role="tabpanel" aria-labelledby={tabButtonIds[activeTab]} tabIndex={0} className="min-h-[19rem] focus-visible:outline-none">
        {activeTab === "recent" ? <RecentBumicerts bumicerts={bumicerts} did={did} /> : <DraftBumicerts />}
      </div>
    </section>
  );
}

export function ManageBumicertsClient({ did, bumicerts, error }: { did: string; bumicerts: BumicertRecord[]; error?: string | null }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6">
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_30rem]">
          <CreateHeroCard />
          <ExplainerCard />
        </div>
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex min-h-[18rem] flex-col items-center justify-center gap-4 rounded-[2rem] bg-muted/30 px-6 text-center"
          >
            <TriangleAlertIcon className="size-8 text-muted-foreground opacity-60" />
            <div className="space-y-1">
              <p className="font-serif text-2xl font-medium text-foreground">Could not load recent Bumicerts</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </motion.div>
        ) : (
          <CreateBumicertTabs bumicerts={bumicerts} did={did} />
        )}
      </div>
    </div>
  );
}

export function ManageBumicertsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 3 }).map((_, index) => <BumicertCardSkeleton key={index} />)}
    </div>
  );
}
