"use client";

/**
 * The collectible a donor "receives" the moment a donation settles.
 *
 * A bold, holographic trading card that deals itself onto the screen, tilts
 * toward the pointer, and catches two slanted glares plus a shifting
 * rainbow foil. Its colour identity scales with how much was given. Purely
 * presentational — it reads the settled lines the checkout already has, so it
 * renders identically for the real checkout and the `/_test` mock experience.
 */

import { useEffect, useMemo, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useFormatter, useTranslations } from "next-intl";

export type RewardLine = {
  kind: "donation" | "tip";
  title: string;
  orgName: string;
  amountUsd: number;
  image?: string | null;
};

type TierKey = "seedling" | "sapling" | "grove" | "canopy" | "oldGrowth";

type Tier = {
  key: TierKey;
  /** Minimum total contribution (USD) to reach this tier. */
  min: number;
  /** Bold foil gradient — the card's colour identity. */
  foil: string;
  /** Glow accent behind the card. */
  glow: string;
};

/** Tiers climb with generosity; the top band stays a genuine rarity. */
const TIERS: Tier[] = [
  { key: "seedling", min: 0, foil: "#34d399, #059669", glow: "#10b981" },
  { key: "sapling", min: 25, foil: "#2dd4bf, #0e7490", glow: "#14b8a6" },
  { key: "grove", min: 75, foil: "#818cf8, #6366f1, #a855f7", glow: "#7c6cf0" },
  { key: "canopy", min: 200, foil: "#fbbf24, #f97316, #ec4899", glow: "#f4813f" },
  { key: "oldGrowth", min: 750, foil: "#fde047, #f472b6, #22d3ee, #4ade80, #fde047", glow: "#f0abfc" },
];

function tierForAmount(amountUsd: number): Tier {
  let match = TIERS[0];
  for (const tier of TIERS) if (amountUsd >= tier.min) match = tier;
  return match;
}

export function DonationRewardCard({
  lines,
  totalUsd,
}: {
  lines: RewardLine[];
  /** Total contributed across every settled line, in USD. */
  totalUsd: number;
}) {
  const t = useTranslations("cart.checkoutPage.reward");
  const format = useFormatter();
  const reduceMotion = useReducedMotion();

  const donationLines = useMemo(() => lines.filter((line) => line.kind === "donation"), [lines]);
  const featured = donationLines[0] ?? lines[0] ?? null;
  const extraProjects = Math.max(0, donationLines.length - 1);
  const tier = useMemo(() => tierForAmount(totalUsd), [totalUsd]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const spring = { stiffness: 150, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useMotionValue(0), spring);
  const rotateY = useSpring(useMotionValue(0), spring);
  const gx = useSpring(useMotionValue(50), { stiffness: 120, damping: 20 });
  const gy = useSpring(useMotionValue(50), { stiffness: 120, damping: 20 });

  // Two slanted white glares that sweep with the pointer.
  const glares = useMotionTemplate`linear-gradient(105deg, transparent 24%, rgba(255,255,255,0.55) 37%, transparent 45%, transparent 55%, rgba(255,255,255,0.35) 64%, transparent 76%)`;
  const glarePos = useMotionTemplate`${gx}% ${gy}%`;
  // Rainbow holographic foil that drifts as the card tilts.
  const holoPos = useMotionTemplate`${gx}% ${gy}%`;

  useEffect(() => {
    if (reduceMotion) return;
    const el = containerRef.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      rotateY.set(nx * 24);
      rotateX.set(-ny * 24);
      gx.set((nx + 0.5) * 100);
      gy.set((ny + 0.5) * 100);
    };
    const leave = () => {
      rotateX.set(0);
      rotateY.set(0);
      gx.set(50);
      gy.set(50);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [reduceMotion, rotateX, rotateY, gx, gy]);

  if (!featured) return null;

  const tierName = t(`tiers.${tier.key}.name`);
  const amount = format.number(totalUsd, { style: "currency", currency: "USD" });

  return (
    <div className="flex flex-col items-center">
      <div ref={containerRef} className="[perspective:1500px]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.7, rotateY: -45, y: 44 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 85, damping: 13, mass: 0.9 }}
          className="relative"
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div
            style={reduceMotion ? undefined : { rotateX, rotateY }}
            className="relative aspect-[63/88] w-[21rem] max-w-[84vw] rounded-[1.7rem] p-[3px] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.7)]"
          >
            {/* Bold gradient rim. */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-[1.7rem]"
              style={{ background: `linear-gradient(145deg, ${tier.foil})` }}
            />

            <div className="relative size-full overflow-hidden rounded-[1.5rem] bg-black">
              {/* Full-bleed artwork. */}
              {featured.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.image}
                  alt=""
                  className="absolute inset-0 size-full scale-105 object-cover"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${tier.foil})` }} aria-hidden />
              )}

              {/* Tier colour wash tints the art toward its identity. */}
              <div
                aria-hidden
                className="absolute inset-0 mix-blend-overlay"
                style={{ background: `linear-gradient(150deg, ${tier.foil})`, opacity: 0.55 }}
              />
              {/* Legibility scrim. */}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
              <div aria-hidden className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/55 to-transparent" />

              {/* Rainbow holographic foil. */}
              {!reduceMotion ? (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 mix-blend-color-dodge"
                  style={{
                    backgroundImage:
                      "linear-gradient(115deg, rgba(255,0,128,0.25), rgba(255,214,0,0.22), rgba(0,229,255,0.25), rgba(123,47,247,0.25), rgba(255,0,128,0.25))",
                    backgroundSize: "320% 320%",
                    backgroundPosition: holoPos,
                    opacity: 0.55,
                  }}
                />
              ) : null}

              {/* Two slanted white glares. */}
              {!reduceMotion ? (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 mix-blend-overlay"
                  style={{ backgroundImage: glares, backgroundSize: "240% 240%", backgroundPosition: glarePos }}
                />
              ) : null}

              {/* One-time reveal sweep. */}
              {!reduceMotion ? (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  initial={{ x: "-150%" }}
                  animate={{ x: "150%" }}
                  transition={{ delay: 0.5, duration: 1.05, ease: "easeInOut" }}
                />
              ) : null}

              {/* ── Content ─────────────────────────────────────────────── */}
              <div className="absolute inset-0 flex flex-col justify-between p-5">
                {/* Tier identity, top. */}
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]" aria-hidden />
                  <span className="text-[11px] font-bold uppercase tracking-[0.38em] text-white/90">
                    {tierName}
                  </span>
                </div>

                {/* Hero, bottom. */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
                    {t("guardianOf")}
                  </p>
                  <h3 className="mt-1 font-instrument text-[2.1rem] italic leading-[1.05] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                    {featured.title}
                  </h3>
                  <p className="mt-1.5 truncate text-xs font-medium text-white/70">
                    {featured.orgName}
                    {extraProjects > 0 ? ` · ${t("moreProjects", { count: extraProjects })}` : ""}
                  </p>

                  <div className="mt-4 h-px w-full bg-white/20" />

                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/55">
                    {t("contributed")}
                  </p>
                  <p className="font-instrument text-[3.6rem] italic leading-[0.95] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.7)]">
                    {amount}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
