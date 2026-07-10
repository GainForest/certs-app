"use client";

import { useRouter } from "next/navigation";
import type { ManageTarget } from "@/lib/links";
import { AddObservationsModal } from "./AddObservationsModal";

/**
 * Full-page host for the quick add-observations flow. The flow used to live in
 * a dialog, but on phones that dialog felt cramped, so it now gets its own
 * route — same fields, same steps, just more room to breathe. The modal
 * component renders unchanged inside a page card (its `ModalContent` wrapper is
 * a plain styled div once it's outside a dialog), so there's no UX drift.
 */
export function AddObservationsPageClient({
  target,
  projectRef,
  observationsHref,
}: {
  target: ManageTarget;
  projectRef: string | null;
  observationsHref: string;
}) {
  const router = useRouter();
  const goToObservations = () => router.push(observationsHref);

  // Full-bleed within the account content container (no confining card) — the
  // flow is a page now, so it uses the same width as the rest of the tab.
  return (
    <div className="pt-1">
      <AddObservationsModal
        target={target}
        projectRef={projectRef}
        onClose={goToObservations}
        onViewObservations={goToObservations}
      />
    </div>
  );
}
