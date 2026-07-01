import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchAuthSession } from "@/app/_lib/auth-server";
import { TainaDashboardClient } from "../../_components/TainaDashboardClient";
import { getAccountRouteData, readAccountRouteParams } from "../../_lib/account-route";

export const metadata: Metadata = {
  title: "Tainá — GainForest",
  robots: { index: false, follow: false },
};

export default async function AccountTainaPage({ params }: { params: Promise<{ did: string }> }) {
  const { did, urlIdentifier } = await readAccountRouteParams(params);

  // The Tainá dashboard is private: it carries the owner's bot, API key and
  // Telegram conversation. Only the signed-in owner of this personal profile
  // gets here — everyone else sees a 404 instead of the tab content.
  const [account, session] = await Promise.all([
    getAccountRouteData(did, urlIdentifier),
    fetchAuthSession().catch(() => ({ isLoggedIn: false as const })),
  ]);
  if (account.kind !== "user" || !session.isLoggedIn || session.did !== did) notFound();

  return <TainaDashboardClient />;
}
