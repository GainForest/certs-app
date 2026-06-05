import type { Metadata } from "next";
import { ManagePlaceholder } from "../_components/ManagePlaceholder";

export const metadata: Metadata = {
  title: "Manage Audio — Bumicerts",
  description: "Placeholder for the Bumicerts manage audio route formerly available at /upload/audio.",
};

export default function AudioPage() {
  return <ManagePlaceholder active="audio" />;
}
