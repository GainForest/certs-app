import type { MetadataRoute } from "next";
import { SITE_URL } from "./_lib/urls";

// Static sitemap for the explorer's surfaces. Records themselves live behind
// shareable `?record=` query params (not crawlable routes), so we list the
// section pages; the home page ranks highest and is the freshest.
const ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/observations", priority: 0.8, changeFrequency: "daily" },
  { path: "/bumicerts", priority: 0.8, changeFrequency: "daily" },
  { path: "/sites", priority: 0.8, changeFrequency: "weekly" },
  { path: "/donations", priority: 0.7, changeFrequency: "daily" },
  { path: "/devices", priority: 0.5, changeFrequency: "hourly" },
  { path: "/status", priority: 0.5, changeFrequency: "hourly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
