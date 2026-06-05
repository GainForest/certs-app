import type { Metadata } from "next";
import { ManagePlaceholder } from "../_components/ManagePlaceholder";

export const metadata: Metadata = {
  title: "Manage Sites — Bumicerts",
  description: "Placeholder for the Bumicerts manage sites route formerly available at /upload/sites.",
};

export default function SitesPage() {
  return <ManagePlaceholder active="sites" />;
}
