import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/audiomoth/firmware — list official AudioMoth-Firmware-Basic
 * releases from GitHub (proxied server-side so the browser needs no GitHub
 * access and we can cache the roster).
 *
 * GET /api/audiomoth/firmware?download=<asset id> — stream one release
 * asset (.bin) to the browser. Only assets we listed ourselves are allowed,
 * which pins downloads to the official OpenAcousticDevices repository.
 */

const RELEASES_URL = "https://api.github.com/repos/OpenAcousticDevices/AudioMoth-Firmware-Basic/releases";
const ASSET_URL_PREFIX = "https://api.github.com/repos/OpenAcousticDevices/AudioMoth-Firmware-Basic/releases/assets/";

const CACHE_TTL_MS = 10 * 60 * 1000;

export interface FirmwareRelease {
  version: string;
  publishedAt: string;
  assetId: number;
  assetName: string;
  sizeBytes: number;
}

interface GitHubReleaseAsset {
  id: number;
  name: string;
  size: number;
}

interface GitHubRelease {
  name: string;
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  assets: GitHubReleaseAsset[];
}

let cachedReleases: { fetchedAt: number; releases: FirmwareRelease[] } | null = null;

async function fetchReleases(): Promise<FirmwareRelease[]> {
  if (cachedReleases && Date.now() - cachedReleases.fetchedAt < CACHE_TTL_MS) {
    return cachedReleases.releases;
  }

  const response = await fetch(RELEASES_URL, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "gainforest-app" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub responded ${response.status}`);
  }

  const data = (await response.json()) as GitHubRelease[];

  const releases: FirmwareRelease[] = [];

  for (const release of data) {
    if (release.draft || release.prerelease) continue;
    const asset = release.assets.find((candidate) => candidate.name.toLowerCase().endsWith(".bin"));
    if (!asset) continue;
    releases.push({
      version: release.name || release.tag_name,
      publishedAt: release.published_at,
      assetId: asset.id,
      assetName: asset.name,
      sizeBytes: asset.size,
    });
  }

  cachedReleases = { fetchedAt: Date.now(), releases };

  return releases;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const download = url.searchParams.get("download");

  try {
    const releases = await fetchReleases();

    if (!download) {
      return NextResponse.json({ releases });
    }

    const assetId = Number.parseInt(download, 10);
    const release = releases.find((candidate) => candidate.assetId === assetId);

    if (!release) {
      return NextResponse.json({ error: "unknown_asset" }, { status: 404 });
    }

    const assetResponse = await fetch(`${ASSET_URL_PREFIX}${assetId}`, {
      headers: { Accept: "application/octet-stream", "User-Agent": "gainforest-app" },
      cache: "no-store",
    });

    if (!assetResponse.ok || !assetResponse.body) {
      return NextResponse.json({ error: "download_failed" }, { status: 502 });
    }

    return new NextResponse(assetResponse.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${release.assetName}"`,
      },
    });
  } catch (error) {
    console.error("[audiomoth] firmware roster failed", error);
    return NextResponse.json({ error: "github_unreachable" }, { status: 502 });
  }
}
