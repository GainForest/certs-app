import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CanonicalRedirect } from "@/app/account/_components/CanonicalRedirect";
import { getGainForestModeratorAccess } from "@/app/internal/badges/_lib/access";
import { fetchFlaggedTestAccounts } from "@/app/internal/badges/_lib/test-accounts";
import { fetchGrantApplicants } from "@/app/_lib/grants";
import { fetchBioblitzRegistrants } from "@/app/_lib/bioblitz";
import { AdminModerationDashboard } from "../../_components/AdminModerationDashboard";
import { accountAdminPath, getAccountRouteData, readAccountRouteParams } from "../../_lib/account-route";

export const metadata: Metadata = {
  title: "Admin — Moderation",
  robots: { index: false, follow: false },
};

export default async function AccountAdminPage({ params }: { params: Promise<{ did: string }> }) {
  const { did, urlIdentifier } = await readAccountRouteParams(params);
  const account = await getAccountRouteData(did, urlIdentifier);

  if (urlIdentifier !== account.urlIdentifier) {
    return <CanonicalRedirect to={accountAdminPath(account.urlIdentifier)} />;
  }

  // The admin list lives on the admin group's own profile and is only visible
  // to members of that group.
  const moderator = await getGainForestModeratorAccess().catch(() => null);
  if (!moderator?.isModerator || moderator.repoDid !== account.did) {
    notFound();
  }

  const [testAccounts, grantApplicants, bioblitzRegistrants] = await Promise.all([
    fetchFlaggedTestAccounts().catch(() => []),
    fetchGrantApplicants().catch(() => []),
    fetchBioblitzRegistrants().catch(() => []),
  ]);
  return (
    <AdminModerationDashboard
      testAccounts={testAccounts}
      grantApplicants={grantApplicants}
      bioblitzRegistrants={bioblitzRegistrants}
    />
  );
}
