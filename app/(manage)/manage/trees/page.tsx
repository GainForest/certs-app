import type { Metadata } from "next";
import { ManagePlaceholder } from "../_components/ManagePlaceholder";

export const metadata: Metadata = {
  title: "Manage Trees — Bumicerts",
  description: "Placeholder for the Bumicerts manage trees route formerly available at /upload/trees.",
};

export default function TreesPage() {
  return <ManagePlaceholder active="trees" />;
}
