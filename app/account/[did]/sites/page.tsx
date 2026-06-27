import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrgManageTabContent } from "../../_components/OrgManageTabContent";
import { accountSitesPath, getAccountRouteData, readAccountRouteParams } from "../../_lib/account-route";

export const metadata: Metadata = {
  title: "Sites — GainForest",
  robots: { index: false, follow: false },
};

export default async function AccountSitesPage({ params }: { params: Promise<{ did: string }> }) {
  const { did, urlIdentifier } = await readAccountRouteParams(params);
  const account = await getAccountRouteData(did, urlIdentifier);

  if (urlIdentifier !== account.urlIdentifier) {
    redirect(accountSitesPath(account.urlIdentifier));
  }

  return <OrgManageTabContent identifier={account.urlIdentifier} tab="sites" />;
}
