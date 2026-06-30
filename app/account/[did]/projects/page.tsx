import type { Metadata } from "next";
import { CanonicalRedirect } from "@/app/account/_components/CanonicalRedirect";
import { AccountProjectsTabContent } from "../../_components/AccountTabContent";
import { accountProjectsPath, getAccountRouteData, readAccountRouteParams } from "../../_lib/account-route";

export async function generateMetadata({ params }: { params: Promise<{ did: string }> }): Promise<Metadata> {
  const { did, urlIdentifier } = await readAccountRouteParams(params);
  const account = await getAccountRouteData(did, urlIdentifier);
  return {
    title: `${account.displayName} — Projects`,
    description: `Projects shared by ${account.displayName}.`,
    alternates: { canonical: `/account/${encodeURIComponent(account.urlIdentifier)}/projects` },
  };
}

export default async function AccountProjectsPage({ params }: { params: Promise<{ did: string }> }) {
  const { did, urlIdentifier } = await readAccountRouteParams(params);
  const account = await getAccountRouteData(did, urlIdentifier);

  if (urlIdentifier !== account.urlIdentifier) {
    return <CanonicalRedirect to={accountProjectsPath(account.urlIdentifier)} />;
  }

  return <AccountProjectsTabContent account={account} did={did} />;
}
