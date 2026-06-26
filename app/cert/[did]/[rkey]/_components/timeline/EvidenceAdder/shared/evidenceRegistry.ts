import {
  FileTextIcon,
  LeafIcon,
  MicIcon,
  TreesIcon,
  type LucideIcon,
} from "lucide-react";
import type { EvidenceTab } from "./types";

export const EVIDENCE_TABS: Array<{ id: EvidenceTab; icon: LucideIcon }> = [
  { id: "audio", icon: MicIcon },
  { id: "trees", icon: TreesIcon },
  { id: "nature", icon: LeafIcon },
  { id: "files", icon: FileTextIcon },
];
