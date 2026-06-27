"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ManageTarget } from "@/lib/links";
import type { ProjectImageGallery } from "../../_lib/indexer";
import { ProjectGalleryViewer } from "../../_components/ProjectGalleryViewer";
import { AccountGalleryUploader, type GalleryProjectOption } from "./AccountGalleryUploader";

export function AccountGalleryClient({
  initialGalleries,
  projects,
  target,
  accountName,
}: {
  initialGalleries: ProjectImageGallery[];
  projects: GalleryProjectOption[];
  // null when the viewer has no rights to add images (read-only).
  target: ManageTarget | null;
  accountName: string;
}) {
  const router = useRouter();
  const [galleries, setGalleries] = useState<ProjectImageGallery[]>(initialGalleries);

  // The empty state is the only place we offer uploads, and only to people who
  // can manage this account. Once the first images land we fall through to the
  // read-only viewer.
  if (galleries.length === 0 && target) {
    return (
      <AccountGalleryUploader
        target={target}
        projects={projects}
        accountName={accountName}
        onUploaded={(gallery) => {
          setGalleries([gallery]);
          // Re-sync from the indexer in the background; the optimistic gallery
          // keeps the just-uploaded images visible until it catches up.
          router.refresh();
        }}
      />
    );
  }

  return <ProjectGalleryViewer galleries={galleries} variant="account" />;
}
