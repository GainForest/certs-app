"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeIcon, BinocularsIcon, HeartIcon, ImageIcon, LeafIcon, MapPinIcon, TreePineIcon } from "lucide-react";
import type { ReactNode } from "react";

export type OverviewFolderTile = {
  id: string;
  title: string;
  href: string;
  count: number | null | undefined;
};

const EASE = [0.25, 0.1, 0.25, 1] as const;

function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("en").format(value);
}

// ── Peeking "art": small DOM illustrations, one per section, echoing the
//    sidebar's project-creation card (image header + skeleton lines). ─────────

function CardArt({ header, lines = [8, 14] }: { header: ReactNode; lines?: number[] }) {
  return (
    <div className="flex h-16 w-14 flex-col gap-1 rounded-lg border border-border/70 bg-background/85 p-1.5 shadow-md backdrop-blur-sm">
      <div className="flex h-8 w-full items-center justify-center rounded-md bg-primary/15">{header}</div>
      <div className="mt-auto space-y-1">
        {lines.map((w, i) => (
          <div key={i} className="h-1.5 rounded-full bg-muted" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
    </div>
  );
}

function MedallionArt({ icon }: { icon: ReactNode }) {
  return (
    <div className="flex h-16 w-14 flex-col items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background/85 shadow-md backdrop-blur-sm">
      <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 ring-2 ring-primary/20">{icon}</div>
      <div className="h-1.5 w-8 rounded-full bg-muted" />
    </div>
  );
}

export const OVERVIEW_FOLDER_ART: Record<string, ReactNode> = {
  certs: <MedallionArt icon={<BadgeIcon className="size-4 text-primary/80" />} />,
  donations: <MedallionArt icon={<HeartIcon className="size-4 text-primary/80" fill="currentColor" />} />,
  projects: <CardArt header={<LeafIcon className="size-4 text-primary/80" />} lines={[7, 11]} />,
  gallery: (
    <div className="flex h-16 w-14 flex-col gap-1 rounded-lg border border-border/70 bg-background/85 p-1.5 shadow-md backdrop-blur-sm">
      <div className="flex h-9 w-full items-center justify-center rounded-md bg-primary/15">
        <ImageIcon className="size-4 text-primary/80" />
      </div>
      <div className="mt-auto flex gap-1">
        <div className="h-2 flex-1 rounded-sm bg-muted" />
        <div className="h-2 w-3 rounded-sm bg-primary/40" />
      </div>
    </div>
  ),
  observations: (
    <div className="flex h-16 w-14 flex-col gap-1 rounded-lg border border-border/70 bg-background/85 p-1.5 shadow-md backdrop-blur-sm">
      <div className="flex h-7 w-full items-center justify-center rounded-md bg-primary/15">
        <BinocularsIcon className="size-4 text-primary/80" />
      </div>
      <div className="mt-auto flex items-end gap-[3px]">
        {[8, 14, 10, 6, 12].map((h, i) => (
          <div key={i} className={i === 1 ? "w-1.5 rounded-sm bg-primary/40" : "w-1.5 rounded-sm bg-muted"} style={{ height: `${h}px` }} />
        ))}
      </div>
    </div>
  ),
  sites: (
    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border/70 bg-primary/5 shadow-md">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.5 0.07 157 / 0.25) 1px, transparent 1px), linear-gradient(90deg, oklch(0.5 0.07 157 / 0.25) 1px, transparent 1px)",
          backgroundSize: "10px 10px",
        }}
      />
      <svg viewBox="0 0 64 64" className="absolute inset-0 size-full">
        <polygon points="14,40 26,16 50,26 44,50 22,50" className="fill-primary/15 stroke-primary/50" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
      <MapPinIcon className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-[60%] text-primary drop-shadow" fill="currentColor" />
    </div>
  ),
  trees: (
    <div className="flex h-16 w-16 flex-col justify-center gap-1.5 rounded-lg border border-border/70 bg-background/85 px-2 shadow-md backdrop-blur-sm">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-1.5">
          <TreePineIcon className="size-3.5 shrink-0 text-primary/70" />
          <div className="h-1.5 flex-1 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  ),
  audio: (
    <div className="flex h-16 w-16 items-center justify-center gap-[3px] rounded-lg border border-border/70 bg-background/85 shadow-md backdrop-blur-sm">
      {[10, 18, 28, 14, 24, 8, 20].map((h, i) => (
        <div key={i} className="w-1 rounded-full bg-primary/50" style={{ height: `${h}px` }} />
      ))}
    </div>
  ),
};

function Folder({ tile, index }: { tile: OverviewFolderTile; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: EASE }}
    >
      <Link href={tile.href} className="group relative block">
        {/* Art peeking from behind the folder, tucked to the right */}
        <div className="pointer-events-none absolute inset-x-0 top-1 z-0 flex justify-end pr-4">
          <div className="rotate-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:rotate-0">
            {OVERVIEW_FOLDER_ART[tile.id]}
          </div>
        </div>

        {/* Folder shape */}
        <div className="relative pt-10">
          {/* tab */}
          <div className="absolute left-0 top-[18px] z-20 h-[24px] w-[44%] rounded-t-xl border border-b-0 border-border/60 bg-card transition-colors duration-300 group-hover:border-primary/40" />
          {/* body */}
          <div className="relative z-10 flex min-h-[132px] flex-col justify-end rounded-3xl rounded-tl-none border border-border/60 bg-card p-4 transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-[0_18px_44px_-18px_oklch(0_0_0/0.28)]">
            <div className="font-instrument text-4xl italic leading-[0.8] text-foreground">{formatCount(tile.count)}</div>
            <p className="mt-2 text-sm font-medium text-foreground transition-colors duration-300 group-hover:text-primary">{tile.title}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function OverviewFolders({ tiles }: { tiles: OverviewFolderTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map((tile, index) => (
        <Folder key={tile.id} tile={tile} index={index} />
      ))}
    </div>
  );
}
