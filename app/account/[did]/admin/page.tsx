import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getGainForestModeratorAccess } from "@/app/internal/badges/_lib/access";
import { fetchFlaggedTestAccounts } from "@/app/internal/badges/_lib/test-accounts";
import { AdminTestAccountsList } from "../../_components/AdminTestAccountsList";
import { accountAdminPath, getAccountRouteData, readAccountRouteParams } from "../../_lib/account-route";

export const metadata: Metadata = {
  title: "Admin — Test accounts",
  robots: { index: false, follow: false },
};

export default async function AccountAdminPage({ params }: { params: Promise<{ did: string }> }) {
  const { did, urlIdentifier } = await readAccountRouteParams(params);
  const account = await getAccountRouteData(did, urlIdentifier);

  if (urlIdentifier !== account.urlIdentifier) {
    redirect(accountAdminPath(account.urlIdentifier));
  }

  // The admin list lives on a steward's own profile and is only visible to
  // members of the admin group.
  const moderator = await getGainForestModeratorAccess().catch(() => null);
  const isOwnProfile = moderator?.session.isLoggedIn && moderator.session.did === account.did;
  if (!moderator?.isModerator || !isOwnProfile) {
    notFound();
  }

  const accounts = await fetchFlaggedTestAccounts();
  return <AdminTestAccountsList accounts={accounts} />;
}
