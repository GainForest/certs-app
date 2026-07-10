"use client";

import { useRouter } from "next/navigation";
import { accountNewObservationPath } from "@/app/account/_lib/account-route";
import {
  switcherGroupIdentifier,
  useAccountList,
  useActiveAccountContext,
} from "../_lib/account-switcher";

export type UseAddObservationsResult = {
  /** Navigates to the add-observations page. */
  open: () => void;
  /**
   * Kept for call-site compatibility. The flow used to mount a modal here; it
   * now lives on its own route, so there is nothing to render alongside the
   * trigger.
   */
  modal: React.ReactNode;
};

/**
 * The quick add-observations flow, honoring the active account context (the
 * org's repo for a group context, the signed-in user otherwise) so new
 * observations land in the right place. Shared by the sidebar card, the feed
 * header action, and the feed composer's image button.
 *
 * The flow is a full page now (roomier than a dialog, better on phones), so
 * this hook simply routes to it for the active account.
 */
export function useAddObservations(sessionDid: string): UseAddObservationsResult {
  const router = useRouter();
  const { groups } = useAccountList(sessionDid);
  const [activeContext, setActiveContext] = useActiveAccountContext(sessionDid);

  const open = () => {
    let identifier: string;
    if (activeContext.type === "group") {
      const activeGroup = groups.find((group) => group.groupDid === activeContext.did) ?? null;
      identifier = activeGroup
        ? switcherGroupIdentifier(activeGroup)
        : activeContext.identifier?.trim() || activeContext.did;
      if (activeGroup) {
        setActiveContext({ type: "group", did: activeGroup.groupDid, identifier, role: activeGroup.role });
      }
    } else {
      identifier = sessionDid;
    }

    router.push(accountNewObservationPath(identifier));
  };

  return { open, modal: null };
}
