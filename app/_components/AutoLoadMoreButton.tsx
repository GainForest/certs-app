"use client";

import { useEffect, useRef, useState } from "react";

export function AutoLoadMoreButton({
  hasMore,
  loading,
  onLoadMore,
  className,
  endClassName,
  idleLabel = "Load more",
  loadingLabel = "Loading",
  endLabel = "You have reached the end.",
  autoLoad,
  onAutoLoadChange,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  className?: string;
  endClassName?: string;
  idleLabel?: string;
  loadingLabel?: string;
  endLabel?: string;
  autoLoad?: boolean;
  onAutoLoadChange?: (enabled: boolean) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const lockedRef = useRef(false);
  const [uncontrolledAutoLoad, setUncontrolledAutoLoad] = useState(false);
  const autoLoadEnabled = autoLoad ?? uncontrolledAutoLoad;
  const latestRef = useRef({ hasMore, loading, onLoadMore, autoLoadEnabled });
  latestRef.current = { hasMore, loading, onLoadMore, autoLoadEnabled };

  const enableAutoLoad = () => {
    setUncontrolledAutoLoad(true);
    onAutoLoadChange?.(true);
  };

  useEffect(() => {
    if (!loading) lockedRef.current = false;
  }, [loading]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !autoLoadEnabled || !hasMore || loading || lockedRef.current) return;
    const rect = button.getBoundingClientRect();
    const inRange = rect.top <= window.innerHeight + 320 && rect.bottom >= -320;
    if (!inRange) return;
    lockedRef.current = true;
    onLoadMore();
  }, [autoLoadEnabled, hasMore, loading, onLoadMore]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const latest = latestRef.current;
        if (!entry?.isIntersecting || !latest.autoLoadEnabled || !latest.hasMore || latest.loading || lockedRef.current) return;
        lockedRef.current = true;
        latest.onLoadMore();
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(button);
    return () => observer.disconnect();
  }, [hasMore]);

  if (!hasMore) {
    return <span className={endClassName}>{endLabel}</span>;
  }

  const handleClick = () => {
    if (loading || lockedRef.current) return;
    enableAutoLoad();
    lockedRef.current = true;
    onLoadMore();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      className={className}
    >
      {loading ? loadingLabel : idleLabel}
    </button>
  );
}
