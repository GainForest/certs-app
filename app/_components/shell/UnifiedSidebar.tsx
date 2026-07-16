"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import {
  BinocularsIcon,
  Building2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  MoreHorizontalIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import packageJson from "@/package.json";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import type { AuthSession } from "../../_lib/auth";
import { GAINFOREST_MODERATION_REPO_DID } from "../../_lib/indexer";
import {
  switcherGroupIdentifier,
  useAccountList,
  useActiveAccountContext,
} from "../../_lib/account-switcher";
import { AdminOnlyIndicator } from "../AdminOnlyIndicator";
import { SignInPrompt } from "../AuthFlow";
import { NAV_ITEMS, isLeafActive, type NavLeaf } from "./nav-config";
import { useCanonicalPathname } from "./paths";
import { SidebarCollapsedProvider, SidebarTooltip, useSidebarCollapsed } from "./sidebar-context";
import { AddObservationsButton, CreateProjectButton, useActiveContextHasProjects } from "./context-actions";
import { ThemeToggle } from "./ThemeToggle";

const APP_VERSION = packageJson.version;

export function UnifiedSidebar({
  authSession,
  collapsed = false,
}: {
  authSession: AuthSession | null;
  collapsed?: boolean;
}) {
  return (
    <SidebarCollapsedProvider value={collapsed}>
    <nav
      className={cn(
        "relative isolate z-30 flex h-full flex-col border-r border-border bg-foreground/3 transition-[width,padding] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none",
        collapsed ? "w-[76px] overflow-visible p-3" : "w-[256px] overflow-hidden p-4",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-108 overflow-hidden"
      >
        {/* Ambient glow */}
        <div className="absolute -bottom-24 left-1/2 h-56 w-[160%] -translate-x-1/2 rounded-[50%] bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-32 w-32 -translate-x-1/2 rounded-full bg-primary/[0.12] blur-2xl" />
        {/* Climbing-vine line art that bleeds off the bottom edge */}
        <ExploreArt />
      </div>

      <SidebarHeader />

      <div className="mt-3 border-t border-border" />

      <div className={cn("flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-3", collapsed ? "overflow-x-hidden" : "pr-1")}>
        {authSession?.isLoggedIn ? <SidebarProfileRow did={authSession.did} /> : null}
        <LayoutGroup id="unified-sidebar-nav">
          <ExploreNav sessionDid={authSession?.isLoggedIn ? authSession.did : null} />
        </LayoutGroup>

        <div className="mt-auto flex flex-col gap-3 pt-4">
          {authSession?.isLoggedIn ? (
            <>
              <BumicertCreationCard sessionDid={authSession.did} />
              <AddObservationsCard sessionDid={authSession.did} />
            </>
          ) : (
            <SignInPrompt collapsed={collapsed} />
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <SocialFooter />
      </div>
    </nav>
    </SidebarCollapsedProvider>
  );
}

/** Circular chevron that straddles the sidebar's right edge to collapse/expand. */
export function SidebarCollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const t = useTranslations("common.sidebar");
  const label = collapsed ? t("expand") : t("collapse");
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            aria-label={label}
            aria-expanded={!collapsed}
            className="absolute -right-3 top-7 z-40 grid size-6 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronLeftIcon className={cn("size-3.5 transition-transform duration-300 motion-reduce:transition-none", collapsed && "rotate-180")} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SidebarProfileRow({ did }: { did: string }) {
  const t = useTranslations("common.sidebar.profileRow");
  const collapsed = useSidebarCollapsed();
  const { personal, groups } = useAccountList(did);
  const [activeContext] = useActiveAccountContext(did);

  // Reflect the account selected in the top-right switcher: when an
  // organization context is active, show that org's name/avatar and link to its
  // profile; otherwise fall back to the signed-in personal account.
  const activeGroup = activeContext.type === "group"
    ? groups.find((group) => group.groupDid === activeContext.did) ?? null
    : null;
  const isGroup = activeGroup != null;
  const card = activeGroup ?? personal;

  const name = card?.displayName?.trim() || t("fallbackName");
  const identifier = activeGroup ? switcherGroupIdentifier(activeGroup) : card?.handle?.trim() || did;
  const href = `/account/${encodeURIComponent(identifier)}`;
  const avatarUrl = card?.avatarUrl ?? null;

  return (
    <SidebarTooltip label={name}>
      <Link
        href={href}
        aria-label={collapsed ? name : t("viewProfile")}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          collapsed ? "h-auto justify-center px-0 py-1.5" : "h-auto justify-start gap-2.5 px-2 py-1.5",
        )}
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill unoptimized sizes="32px" className="object-cover" />
          ) : isGroup ? (
            <Building2Icon className="size-4" />
          ) : (
            <UserIcon className="size-4" />
          )}
        </span>
        {collapsed ? null : (
          <span className="flex min-w-0 flex-1 flex-col text-left">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{t("viewProfile")}</span>
          </span>
        )}
      </Link>
    </SidebarTooltip>
  );
}

function ExploreNav({ sessionDid }: { sessionDid: string | null }) {
  const pathname = useCanonicalPathname();
  const t = useTranslations("common.sidebar.items");
  const sidebarT = useTranslations("common.sidebar");
  const sectionsT = useTranslations("common.sidebar.sections");
  const collapsed = useSidebarCollapsed();
  const [moreOpen, setMoreOpen] = useState(false);
  // GainForest moderators (members of the admin group, any role) see the
  // admin-only entries. Same detection as the account menu's /admin link;
  // the routes themselves re-check access server-side.
  const { groups } = useAccountList(sessionDid);
  const isModerator = groups.some((group) => group.groupDid === GAINFOREST_MODERATION_REPO_DID);
  const sections = NAV_ITEMS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || isModerator),
  })).filter((section) => section.items.length > 0);

  // Keep the everyday path short for new visitors. Specialist destinations
  // remain one click away and open automatically whenever one is active.
  const primaryIds = new Set(["feed", "projects", "organizations", "observations"]);
  const primarySections = sections
    .map((section) => ({ ...section, items: section.items.filter((item) => primaryIds.has(item.id)) }))
    .filter((section) => section.items.length > 0);
  const secondarySections = sections
    .map((section) => ({ ...section, items: section.items.filter((item) => !primaryIds.has(item.id)) }))
    .filter((section) => section.items.length > 0);
  const secondaryActive = secondarySections.some((section) =>
    section.items.some((item) => isLeafActive(item.pathCheck, pathname)),
  );
  const showMore = moreOpen || secondaryActive;
  let leafIndex = 0;

  const renderSections = (items: typeof sections, showSectionLabels: boolean) =>
    items.map((section, sectionIndex) => (
      <div key={section.id} className="flex flex-col gap-0.5">
        {showSectionLabels && !collapsed ? (
          <p className="px-2.5 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {sectionsT(section.id)}
          </p>
        ) : collapsed && sectionIndex > 0 ? (
          <div aria-hidden className="mx-auto my-1 h-px w-6 rounded-full bg-border" />
        ) : null}
        <ul className="flex flex-col gap-0.5">
          {section.items.map((item) => {
            leafIndex += 1;
            return (
              <NavLeafRow
                key={item.id}
                item={{ ...item, text: t(item.id) }}
                isActive={isLeafActive(item.pathCheck, pathname)}
                index={leafIndex}
              />
            );
          })}
        </ul>
      </div>
    ));

  return (
    <div className="flex flex-col gap-1">
      {renderSections(primarySections, false)}
      {secondarySections.length > 0 ? (
        <div className="mt-1 border-t border-border/70 pt-1">
          <SidebarTooltip label={sidebarT("more")}>
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={showMore}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-8 w-full text-muted-foreground hover:text-foreground",
                collapsed ? "justify-center px-0" : "justify-start gap-2.5 px-2.5",
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                <MoreHorizontalIcon className="size-4" />
              </span>
              {collapsed ? null : (
                <>
                  <span className="flex-1 text-left">{sidebarT("more")}</span>
                  <ChevronDownIcon className={cn("size-3.5 transition-transform", showMore && "rotate-180")} />
                </>
              )}
            </button>
          </SidebarTooltip>
          {showMore ? <div className="mt-1 flex flex-col gap-2">{renderSections(secondarySections, true)}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function SidebarHeader() {
  const collapsed = useSidebarCollapsed();
  return (
    <div className={cn("mb-4 flex w-full flex-col gap-2", collapsed && "items-center")}>
      <Link className={cn("flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50", collapsed ? "justify-center" : "gap-2.5")} href="/feed" aria-label="GainForest home">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.5,
            delay: 0.1,
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          className="h-8 w-8 flex items-center justify-center shrink-0"
        >
          <Image
            src="/assets/media/images/app-icon.png"
            alt="GainForest"
            width={28}
            height={28}
            className="drop-shadow-md"
          />
        </motion.div>

        {collapsed ? null : (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.15,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="font-serif text-xl font-bold tracking-tight text-foreground"
          >
            GainForest
          </motion.span>
        )}
      </Link>
    </div>
  );
}

function NavLeafRow({ item, isActive, index, paired = false }: { item: NavLeaf; isActive: boolean; index: number; paired?: boolean }) {
  const collapsed = useSidebarCollapsed();
  const showConnector = paired && !collapsed;
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.05 * index,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={cn("relative", showConnector && "ml-3.5")}
    >
      {showConnector ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -left-3.5 -top-1 bottom-1/2 w-3 rounded-bl-[10px] border-b border-l border-border"
        />
      ) : null}
      <SidebarTooltip label={item.text}>
        <Link
          href={item.href}
          aria-label={collapsed ? item.text : undefined}
          aria-current={isActive ? "page" : undefined}
          className="group block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <motion.div
            whileHover={collapsed ? undefined : { x: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              buttonVariants({ variant: isActive ? "default" : "ghost" }),
              // Lighter, denser rows: only the active row keeps the filled pill;
              // inactive rows are a plain icon + label with no chip background.
              "relative h-8 w-full",
              collapsed ? "justify-center px-0" : "justify-start gap-2.5 px-2.5",
              !isActive && "text-muted-foreground group-hover:text-primary hover:text-primary",
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center">
              <item.Icon className="h-4 w-4 shrink-0" />
            </span>
            {collapsed ? null : <span className="flex-1 text-left">{item.text}</span>}
            {item.adminOnly ? (
              <AdminOnlyIndicator className={collapsed ? "absolute right-1 top-1" : undefined} />
            ) : null}
          </motion.div>
        </Link>
      </SidebarTooltip>
    </motion.li>
  );
}

function BumicertCreationCard({ sessionDid }: { sessionDid: string }) {
  const t = useTranslations("common.sidebar.creationCard");
  const collapsed = useSidebarCollapsed();
  const hasProjects = useActiveContextHasProjects(sessionDid);

  // Hide the create-project CTA once this account already has a project.
  if (hasProjects) return null;

  return (
    <SidebarTooltip label={t("createProject")}>
      <span className={cn("flex", collapsed ? "mx-auto w-fit" : "w-full")}>
        <CreateProjectButton
          sessionDid={sessionDid}
          className={cn(
            buttonVariants({ variant: collapsed ? "outline" : "default", size: collapsed ? "icon" : "sm" }),
            collapsed ? "bg-background" : "w-full justify-start gap-2",
          )}
        >
          <PlusIcon />
          <span className={collapsed ? "sr-only" : undefined}>{t("createProject")}</span>
        </CreateProjectButton>
      </span>
    </SidebarTooltip>
  );
}

function AddObservationsCard({ sessionDid }: { sessionDid: string }) {
  const t = useTranslations("common.sidebar.creationCard");
  const collapsed = useSidebarCollapsed();

  return (
    <SidebarTooltip label={t("addObservations")}>
      <span className={cn("flex", collapsed ? "mx-auto w-fit" : "w-full")}>
        <AddObservationsButton
          sessionDid={sessionDid}
          dataTaina="add-observations"
          className={cn(
            buttonVariants({ variant: "outline", size: collapsed ? "icon" : "sm" }),
            collapsed ? "bg-background" : "w-full justify-start gap-2 bg-background",
          )}
        >
          <BinocularsIcon />
          <span className={collapsed ? "sr-only" : undefined}>{t("addObservations")}</span>
        </AddObservationsButton>
      </span>
    </SidebarTooltip>
  );
}

function SocialFooter() {
  const collapsed = useSidebarCollapsed();
  const footerT = useTranslations("common.sidebar");
  return (
    <div className={cn("flex px-1", collapsed ? "flex-col items-center gap-1" : "items-center justify-between")}>
      {collapsed ? null : (
        <Link
          href="/changelog"
          className="rounded-full text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          title={footerT("changelogLink")}
        >
          GainForest v{APP_VERSION}
        </Link>
      )}
      {/* Language + theme controls live together in the sidebar footer; the
          language picker sits directly to the left of the dark/light toggle. */}
      <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "gap-0.5")}>
        <LanguageSelector compact={collapsed} />
        <ThemeToggle />
      </div>
    </div>
  );
}

function ExploreArt() {
  // Two climbing vines hugging either edge — growth creeping up the sides of
  // the sidebar.
  return (
    <>
      <Vine side="left" className="bottom-0 left-0 h-26 w-5" />
      <Vine side="right" className="bottom-0 right-0 h-26 w-5" />
    </>
  );
}

function Vine({ side, className }: { side: "left" | "right"; className?: string }) {
  // Drawn once for the left edge; the right edge mirrors it horizontally so
  // the leaves always curl inward toward the sidebar.
  return (
    <svg
      viewBox="0 0 60 240"
      fill="none"
      preserveAspectRatio="xMidYMax meet"
      className={cn("absolute text-primary", side === "right" && "-scale-x-100", className)}
    >
      {/* Winding stem climbing from the bottom edge */}
      <path
        d="M16 240 C 9 206 24 188 16 158 C 9 130 26 110 16 80 C 10 56 22 36 16 8"
        className="stroke-primary/30"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Leaves branching off, alternating sides of the stem */}
      <g className="fill-primary/20">
        <path d="M16 198 C 32 194 39 178 36 168 C 25 171 16 183 16 198 Z" />
        <path d="M16 150 C 2 147 -4 133 -1 124 C 11 127 16 138 16 150 Z" />
        <path d="M16 104 C 32 100 39 84 36 74 C 25 77 16 89 16 104 Z" />
        <path d="M16 58 C 2 55 -4 41 -1 32 C 11 35 16 46 16 58 Z" />
      </g>
    </svg>
  );
}
