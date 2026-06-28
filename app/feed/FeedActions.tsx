"use client";

/**
 * Interactive layer for the feed — Bluesky-style like + comment + post, written
 * through the app.gainforest.feed.* lexicons.
 *
 * The read side (counts, public threads, who-liked-what) is served by the
 * hyperindex once it ingests these collections. Until then this layer keeps the
 * viewer's OWN like/comment state in localStorage (per signed-in account) so the
 * experience is real and persistent in-browser, and upgrades cleanly when the
 * indexer starts returning aggregates. Every write hits the viewer's own repo
 * via the existing mutation helpers.
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HeartIcon, Loader2Icon, MessageCircleIcon, NewspaperIcon, SendHorizonalIcon } from "lucide-react";
import {
  createFeedComment,
  createFeedLike,
  createFeedPost,
  deleteFeedLike,
} from "@/app/(manage)/manage/_lib/mutations";
import { redirectToLogin } from "@/app/_lib/auth-client";
import { cn } from "@/lib/utils";

export type LocalComment = { id: string; subjectUri: string; text: string; createdAt: string };
export type LocalPost = { id: string; text: string; createdAt: string };

export type FeedInteractions = {
  ready: boolean;
  isLiked: (uri: string) => boolean;
  toggleLike: (uri: string) => Promise<void>;
  commentsFor: (uri: string) => LocalComment[];
  addComment: (uri: string, text: string) => Promise<void>;
  localPosts: LocalPost[];
  addPost: (text: string) => Promise<void>;
};

const POST_MAX = 300;
const COMMENT_MAX = 1000;

// ── localStorage (per signed-in account) ─────────────────────────────────────

type LikeMap = Record<string, string>; // subjectUri -> like record rkey
type CommentMap = Record<string, LocalComment[]>; // subjectUri -> viewer's comments

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / disabled — interactions still work for the session.
  }
}

/** Per-account interaction state, persisted in-browser until the indexer serves it. */
export function useFeedInteractions(viewerDid: string | null): FeedInteractions {
  const [likes, setLikes] = useState<LikeMap>({});
  const [comments, setComments] = useState<CommentMap>({});
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [ready, setReady] = useState(false);

  const likesKey = viewerDid ? `gf:feed:likes:${viewerDid}` : null;
  const commentsKey = viewerDid ? `gf:feed:comments:${viewerDid}` : null;
  const postsKey = viewerDid ? `gf:feed:posts:${viewerDid}` : null;

  useEffect(() => {
    if (!viewerDid || !likesKey || !commentsKey || !postsKey) {
      setLikes({});
      setComments({});
      setPosts([]);
      setReady(false);
      return;
    }
    setLikes(readJson<LikeMap>(likesKey, {}));
    setComments(readJson<CommentMap>(commentsKey, {}));
    setPosts(readJson<LocalPost[]>(postsKey, []));
    setReady(true);
  }, [viewerDid, likesKey, commentsKey, postsKey]);

  const isLiked = useCallback((uri: string) => Boolean(likes[uri]), [likes]);

  const toggleLike = useCallback(
    async (uri: string) => {
      if (!viewerDid || !likesKey) return;
      const existingRkey = likes[uri];
      if (existingRkey) {
        // Optimistic unlike.
        setLikes((prev) => {
          const next = { ...prev };
          delete next[uri];
          writeJson(likesKey, next);
          return next;
        });
        try {
          await deleteFeedLike(existingRkey);
        } catch (error) {
          setLikes((prev) => {
            const next = { ...prev, [uri]: existingRkey };
            writeJson(likesKey, next);
            return next;
          });
          throw error;
        }
        return;
      }
      // Optimistic like with a placeholder rkey, swapped for the real one.
      const pending = "pending";
      setLikes((prev) => ({ ...prev, [uri]: pending }));
      try {
        const result = await createFeedLike(uri);
        setLikes((prev) => {
          const next = { ...prev, [uri]: result.rkey };
          writeJson(likesKey, next);
          return next;
        });
      } catch (error) {
        setLikes((prev) => {
          const next = { ...prev };
          delete next[uri];
          writeJson(likesKey, next);
          return next;
        });
        throw error;
      }
    },
    [likes, likesKey, viewerDid],
  );

  const commentsFor = useCallback((uri: string) => comments[uri] ?? [], [comments]);

  const addComment = useCallback(
    async (uri: string, text: string) => {
      if (!viewerDid || !commentsKey) return;
      const result = await createFeedComment({ text, subjectUri: uri });
      const comment: LocalComment = {
        id: result.uri,
        subjectUri: uri,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => {
        const next = { ...prev, [uri]: [...(prev[uri] ?? []), comment] };
        writeJson(commentsKey, next);
        return next;
      });
    },
    [commentsKey, viewerDid],
  );

  const addPost = useCallback(
    async (text: string) => {
      if (!viewerDid || !postsKey) return;
      const result = await createFeedPost({ text });
      const post: LocalPost = { id: result.uri, text: text.trim(), createdAt: new Date().toISOString() };
      setPosts((prev) => {
        const next = [post, ...prev];
        writeJson(postsKey, next);
        return next;
      });
    },
    [postsKey, viewerDid],
  );

  return { ready, isLiked, toggleLike, commentsFor, addComment, localPosts: posts, addPost };
}

// ── The viewer's own just-published posts (optimistic, above the timeline) ───

export function LocalPostsList({ posts }: { posts: LocalPost[] }) {
  const t = useTranslations("common.feed");
  if (posts.length === 0) return null;
  return (
    <ol className="relative">
      {posts.map((post) => (
        <li key={post.id} className="relative">
          <div className="flex gap-3 rounded-2xl px-3 py-3.5">
            <span className="relative mt-0.5 grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
              <NewspaperIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="truncate font-medium text-foreground">{t("actions.you")}</span>
                <span className="text-muted-foreground/60">·</span>
                <span className="shrink-0 text-xs text-muted-foreground/80">{t("actions.postedJustNow")}</span>
                <span className="ml-1 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                  {t("composer.postedTitle")}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{post.text}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Composer (publish a post) ────────────────────────────────────────────────

export function FeedComposer({
  signedIn,
  onPost,
}: {
  signedIn: boolean;
  onPost: (text: string) => Promise<void>;
}) {
  const t = useTranslations("common.feed");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const remaining = POST_MAX - text.length;
  const canPost = signedIn && text.trim().length > 0 && remaining >= 0 && !busy;

  async function submit() {
    if (!signedIn) {
      redirectToLogin();
      return;
    }
    if (!canPost) return;
    setBusy(true);
    setError(null);
    try {
      await onPost(text.trim());
      setText("");
      setPosted(true);
      window.setTimeout(() => setPosted(false), 6000);
    } catch {
      setError(t("actions.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 rounded-2xl border border-border/60 bg-background/60 p-3">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPosted(false);
        }}
        onFocus={() => {
          if (!signedIn) redirectToLogin();
        }}
        rows={2}
        maxLength={POST_MAX + 40}
        placeholder={signedIn ? t("composer.placeholder") : t("composer.signedOut")}
        aria-label={t("composer.placeholder")}
        className="w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground/70">
          {posted ? t("composer.postedNote") : signedIn ? "" : t("actions.signInToInteract")}
        </span>
        <div className="flex items-center gap-2">
          {text.length > 0 ? (
            <span className={cn("text-xs tabular-nums", remaining < 0 ? "text-destructive" : "text-muted-foreground/70")}>
              {remaining}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={signedIn ? !canPost : false}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {busy ? t("composer.posting") : t("composer.post")}
          </button>
        </div>
      </div>
      {error ? <p className="mt-1 px-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

// ── Per-row action bar (like + comment) ──────────────────────────────────────

export function FeedActionBar({
  subjectUri,
  signedIn,
  interactions,
}: {
  subjectUri: string;
  signedIn: boolean;
  interactions: FeedInteractions;
}) {
  const t = useTranslations("common.feed");
  const liked = interactions.isLiked(subjectUri);
  const myComments = interactions.commentsFor(subjectUri);
  const [open, setOpen] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLike() {
    if (!signedIn) {
      redirectToLogin();
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    setError(null);
    try {
      await interactions.toggleLike(subjectUri);
    } catch {
      setError(t("actions.errorGeneric"));
    } finally {
      setLikeBusy(false);
    }
  }

  function onCommentClick() {
    if (!signedIn) {
      redirectToLogin();
      return;
    }
    setOpen((v) => !v);
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        <button
          type="button"
          onClick={() => void onLike()}
          aria-pressed={liked}
          aria-label={liked ? t("actions.liked") : t("actions.like")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted",
            liked ? "text-rose-500" : "hover:text-foreground",
          )}
        >
          <HeartIcon className={cn("size-4", liked && "fill-current")} />
          <span>{liked ? t("actions.liked") : t("actions.like")}</span>
        </button>
        <button
          type="button"
          onClick={onCommentClick}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted hover:text-foreground"
        >
          <MessageCircleIcon className="size-4" />
          <span>{myComments.length > 0 ? t("actions.comments", { count: myComments.length }) : t("actions.comment")}</span>
        </button>
      </div>

      {error ? <p className="px-2.5 pt-1 text-xs text-destructive">{error}</p> : null}

      {open ? (
        <CommentPanel comments={myComments} onSubmit={(text) => interactions.addComment(subjectUri, text)} />
      ) : null}
    </div>
  );
}

function CommentPanel({
  comments,
  onSubmit,
}: {
  comments: LocalComment[];
  onSubmit: (text: string) => Promise<void>;
}) {
  const t = useTranslations("common.feed");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = text.trim().length > 0 && text.length <= COMMENT_MAX && !busy;

  async function send() {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(text.trim());
      setText("");
    } catch {
      setError(t("actions.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-2.5">
      {comments.length > 0 ? (
        <ul className="mb-2 space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="text-sm">
              <span className="font-medium text-foreground">{t("actions.you")}</span>{" "}
              <span className="text-muted-foreground/70 text-xs">{t("actions.postedJustNow")}</span>
              <p className="text-foreground/90">{c.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          maxLength={COMMENT_MAX + 40}
          placeholder={t("actions.commentPlaceholder")}
          aria-label={t("actions.commentPlaceholder")}
          className="min-h-9 flex-1 resize-none rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          aria-label={t("actions.send")}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2Icon className="size-4 animate-spin" /> : <SendHorizonalIcon className="size-4" />}
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground/70">{t("actions.yourCommentsNote")}</p>
    </div>
  );
}
