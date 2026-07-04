#!/usr/bin/env node
// Regenerates app/_lib/data/maearth-donations.json — the map from an
// organization's DID to its live donation (campaign) page on maearth.com.
//
// How it works:
//   1. Read https://maearth.com/sitemap.xml. It lists two shapes we care about:
//        /organizations/<org-slug>          — the org profile page
//        /<org-slug>/<campaign-slug>        — a fundraising campaign page
//   2. Fetch every org profile page and extract the atproto DID that Ma Earth
//      embeds in it (the same DID the org uses on this site).
//   3. For each org that has at least one campaign page, record the most
//      recently updated campaign URL (by sitemap <lastmod>) as its donate link.
//
// Run: node scripts/generate-maearth-donation-links.mjs
// Commit the regenerated JSON. Safe to re-run any time; it only reads
// public pages.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SITEMAP_URL = "https://maearth.com/sitemap.xml";
const OUT_PATH = path.join(process.cwd(), "app", "_lib", "data", "maearth-donations.json");
const CONCURRENCY = 12;

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": "bhumi-stats-donation-link-sync" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

function parseSitemap(xml) {
  const orgSlugs = [];
  const campaignsByOrgSlug = new Map();
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = match[1];
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? "";
    const pathPart = loc.replace(/^https:\/\/maearth\.com\/?/, "");
    if (!pathPart) continue;
    const segments = pathPart.split("/").filter(Boolean);
    if (segments[0] === "organizations" && segments.length === 2) {
      orgSlugs.push(segments[1]);
    } else if (segments.length === 2 && !["organizations", "users", "_next"].includes(segments[0])) {
      const list = campaignsByOrgSlug.get(segments[0]) ?? [];
      list.push({ url: loc, lastmod });
      campaignsByOrgSlug.set(segments[0], list);
    }
  }
  return { orgSlugs, campaignsByOrgSlug };
}

async function resolveDid(orgSlug) {
  try {
    const html = await fetchText(`https://maearth.com/organizations/${orgSlug}`);
    return html.match(/did:plc:[a-z2-7]+/)?.[0] ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const xml = await fetchText(SITEMAP_URL);
  const { orgSlugs, campaignsByOrgSlug } = parseSitemap(xml);
  console.log(`sitemap: ${orgSlugs.length} orgs, ${campaignsByOrgSlug.size} orgs with campaigns`);

  const entries = {};
  let done = 0;
  const queue = [...orgSlugs];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const slug = queue.shift();
        if (!slug) return;
        const did = await resolveDid(slug);
        done += 1;
        if (done % 100 === 0) console.log(`  resolved ${done}/${orgSlugs.length}`);
        if (!did) continue;
        const campaigns = campaignsByOrgSlug.get(slug);
        if (!campaigns?.length) continue;
        const latest = [...campaigns].sort((a, b) => (b.lastmod || "").localeCompare(a.lastmod || ""))[0];
        // A DID can own several Ma Earth org pages; keep the first with a campaign.
        entries[did] ??= { orgSlug: slug, donateUrl: latest.url };
      }
    }),
  );

  const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    `${JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), source: SITEMAP_URL, entries: sorted }, null, 2)}\n`,
  );
  console.log(`wrote ${Object.keys(sorted).length} donation links → ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
