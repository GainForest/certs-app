"use client";

/**
 * Follow affordances over app.certified.graph.follow: a Follow / Following pill
 * and a "N followers · N following" counts line.
 *
 * Both read the same `useFollow` state. When several of these render for one
 * account on a surface (e.g. a profile hero with the button up top and the
 * counts under the name), wrap them in a single <FollowProvider> so they share
 * one fetch and one optimistic state — clicking Follow bumps the count instantly.
 * Used standalone (no provider), each fetches its own copy.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2Icon, UserCheckIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCompact } from "../_lib/format";
import { useFollow, type UseFollow } from "../_lib/follows";

const FollowContext = createContext<UseFollow | null>(null);

/** Share one follow state across a button + counts for the same account. */
export function FollowProvider({ targetDid, children }: { targetDid: string | null; children: ReactNode }) {
  const follow = useFollow(targetDid);
  return <FollowContext.Provider value={follow}>{children}</FollowContext.Provider>;
}

/** Use the provider's shared state when present, else fetch our own. Both hooks
 *  are always called (rules of hooks); the self-fetch idles on a null target. */
function useFollowState(targetDid: string | null): UseFollow {
  const shared = useContext(FollowContext);
  const own = useFollow(shared ? null : targetDid);
  return shared ?? own;
}

export function FollowButton({
  targetDid,
  name,
  size = "sm",
  className,
}: {
  targetDid: string | null;
  /** Account name, for the accessible label. */
  name?: string | null;
  size?: "sm" | "default";
  className?: string;
}) {
  const t = useTranslations("common.follow");
  const follow = useFollowState(targetDid);

  // No button for your own account, an unknown account, or before we know who
  // the viewer is (avoids a flash of "Follow" on your own profile).
  if (!targetDid || follow.isSelf) return null;

  const accountName = name?.trim() || t("genericName");
  const label = follow.isFollowing ? t("following") : t("follow");
  const aria = follow.isFollowing
    ? t("unfollowAria", { name: accountName })
    : t("followAria", { name: accountName });

  return (
    <Button
      type="button"
      size={size}
      variant={follow.isFollowing ? "outline" : "default"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void follow.toggle().catch(() => {});
      }}
      disabled={follow.busy}
      aria-pressed={follow.isFollowing}
      aria-label={aria}
      className={className}
    >
      {follow.busy ? (
        <Loader2Icon className="animate-spin" />
      ) : follow.isFollowing ? (
        <UserCheckIcon />
      ) : (
        <UserPlusIcon />
      )}
      {label}
    </Button>
  );
}

export function FollowStats({
  targetDid,
  className,
}: {
  targetDid: string | null;
  className?: string;
}) {
  const t = useTranslations("common.follow");
  const follow = useFollowState(targetDid);
  if (!targetDid) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground", className)}>
      <span>
        <b className="font-semibold tabular-nums text-foreground">{formatCompact(follow.followers)}</b>{" "}
        {t("followersLabel")}
      </span>
      <span>
        <b className="font-semibold tabular-nums text-foreground">{formatCompact(follow.following)}</b>{" "}
        {t("followingLabel")}
      </span>
    </span>
  );
}
