import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountOrganizationsTabContent } from "../../_components/AccountTabContent";
import { accountOrganizationsPath, getAccountRouteData, readAccountRouteParams } from "../../_lib/account-route";

export async function generateMetadata({ params }: { params: Promise<{ did: string }> }): Promise<Metadata> {
  const { did, urlIdentifier } = await readAccountRouteParams(params);
  const account = await getAccountRouteData(did, urlIdentifier);
  return {
    title: `${account.displayName} — Organizations`,
    description: `Organizations ${account.displayName} belongs to.`,
    alternates: { canonical: `/account/${encodeURIComponent(account.urlIdentifier)}/organizations` },
    robots: { index: false, follow: false },
  };
}

export default async function AccountOrganizationsPage({ params }: { params: Promise<{ did: string }> }) {
  const { did, urlIdentifier } = await readAccountRouteParams(params);
  const account = await getAccountRouteData(did, urlIdentifier);

  if (urlIdentifier !== account.urlIdentifier) {
    redirect(accountOrganizationsPath(account.urlIdentifier));
  }

  return <AccountOrganizationsTabContent account={account} did={did} />;
}
