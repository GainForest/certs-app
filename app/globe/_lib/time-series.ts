/**
 * Drone time-series detection.
 *
 * Organizations fly drones over the same site at different times, so their
 * published orthomosaics (raster layers) can overlap on the map — toggling
 * them individually just stacks one image on top of another. This module
 * groups repeat flights of the same area into a "time series" so the UI can
 * offer a time slider instead of a pile of indistinguishable toggles.
 *
 * Detection is purely geometric + temporal, from data already on the layer
 * records:
 *   - `bounds`      — the image footprint ("minLng,minLat,maxLng,maxLat")
 *   - `capturedAt`  — the capture day (dataDate / capturedAt / timeLabel, or
 *                     a date embedded in the name/description)
 *
 * Two drone images belong to the same series when their footprints overlap
 * substantially — intersection area ≥ half of the smaller footprint — which
 * distinguishes repeat flights (near-identical or contained footprints) from
 * adjacent plots surveyed in one campaign (small edge overlaps). Overlap
 * groups are then only promoted to a series when they span at least two
 * distinct capture days; same-day overlaps are complementary coverage, not
 * change over time.
 */

import type { GlobeLayer, LngLatBounds } from "./globe-types";

/** Layer types that render drone/aerial imagery (matches the roster API). */
const DRONE_LAYER_TYPES = new Set<GlobeLayer["type"]>(["raster_tif", "tms_tile"]);

/** Minimum intersection-over-smaller-footprint for two flights to count as
 *  covering "the same area". Repeat flights score ≈1; adjacent survey plots
 *  that merely touch score well below this. */
const OVERLAP_RATIO = 0.5;

export type DroneTimeSeriesStep = {
  /** Capture day, "YYYY-MM-DD". */
  date: string;
  /** Layer ids captured on that day (usually one). */
  layerIds: string[];
};

export type DroneTimeSeries = {
  /** Stable id (derived from member layer ids). */
  id: string;
  /** Display name shared by the flights (dates stripped). */
  name: string;
  /** Union of all member footprints — where the camera flies to. */
  bounds: LngLatBounds;
  /** All member layers, oldest capture first. */
  layers: GlobeLayer[];
  /** Distinct capture days, ascending — the slider's stops. */
  steps: DroneTimeSeriesStep[];
};

function boundsArea(bounds: LngLatBounds): number {
  return Math.max(0, bounds[2] - bounds[0]) * Math.max(0, bounds[3] - bounds[1]);
}

/** Intersection area over the smaller footprint's area (0 when disjoint). */
export function overlapRatio(a: LngLatBounds, b: LngLatBounds): number {
  const width = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
  const height = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  if (width <= 0 || height <= 0) return 0;
  const smaller = Math.min(boundsArea(a), boundsArea(b));
  if (smaller <= 0) return 0;
  return (width * height) / smaller;
}

function unionBounds(all: LngLatBounds[]): LngLatBounds {
  return all.reduce((acc, bounds) => [
    Math.min(acc[0], bounds[0]),
    Math.min(acc[1], bounds[1]),
    Math.max(acc[2], bounds[2]),
    Math.max(acc[3], bounds[3]),
  ]);
}

/** Strip date decorations from a flight name: "Tumanan (2025-04-09)" and
 *  "Orthomosaic 2024-08-21" both lose their dates. */
function stripDates(name: string): string {
  return name
    .replace(/\(\s*\d{2,4}-\d{2}-\d{2,4}\s*\)/g, " ")
    .replace(/\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s\-–—:,]+$/g, "")
    .trim();
}

/** Shared display name for a series: the members' common date-less name, or
 *  their longest common prefix, or the first member's cleaned name. */
function seriesName(layers: GlobeLayer[]): string {
  const cleaned = layers.map((layer) => stripDates(layer.name)).filter(Boolean);
  if (cleaned.length === 0) return layers[0]?.name ?? "";
  const unique = new Set(cleaned.map((name) => name.toLowerCase()));
  if (unique.size === 1) return cleaned[0]!;
  let prefix = cleaned[0]!;
  for (const name of cleaned.slice(1)) {
    while (prefix && !name.toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
    }
  }
  prefix = prefix.replace(/[\s\-–—:,(]+$/g, "").trim();
  return prefix.length >= 3 ? prefix : cleaned[0]!;
}

/** Group an organization's drone layers into time series (repeat flights over
 *  the same area on different days). Layers without a footprint or capture
 *  day never group. Series are returned oldest-area-first (by first capture). */
export function buildDroneTimeSeries(layers: GlobeLayer[]): DroneTimeSeries[] {
  const flights = layers.filter(
    (layer): layer is GlobeLayer & { bounds: LngLatBounds; capturedAt: string } =>
      DRONE_LAYER_TYPES.has(layer.type) &&
      Array.isArray(layer.bounds) &&
      typeof layer.capturedAt === "string",
  );
  if (flights.length < 2) return [];

  // Union-find over pairwise footprint overlap.
  const parent = flights.map((_, index) => index);
  const find = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]!]!;
      index = parent[index]!;
    }
    return index;
  };
  for (let a = 0; a < flights.length; a++) {
    for (let b = a + 1; b < flights.length; b++) {
      if (overlapRatio(flights[a]!.bounds, flights[b]!.bounds) >= OVERLAP_RATIO) {
        parent[find(a)] = find(b);
      }
    }
  }

  const groups = new Map<number, typeof flights>();
  flights.forEach((flight, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(flight);
    groups.set(root, group);
  });

  const series: DroneTimeSeries[] = [];
  for (const group of groups.values()) {
    const days = new Set(group.map((flight) => flight.capturedAt));
    if (group.length < 2 || days.size < 2) continue;

    const sorted = [...group].sort(
      (a, b) => a.capturedAt.localeCompare(b.capturedAt) || a.id.localeCompare(b.id),
    );
    const steps: DroneTimeSeriesStep[] = [...days]
      .sort()
      .map((date) => ({
        date,
        layerIds: sorted.filter((flight) => flight.capturedAt === date).map((flight) => flight.id),
      }));

    series.push({
      id: `time-series:${sorted.map((flight) => flight.id).join("+")}`,
      name: seriesName(sorted),
      bounds: unionBounds(sorted.map((flight) => flight.bounds)),
      layers: sorted,
      steps,
    });
  }

  return series.sort((a, b) => a.name.localeCompare(b.name));
}
