import type { Metadata } from "next";
import { fetchAuthSession } from "@/app/_lib/auth-server";
import { fetchUserCgsGroups } from "@/app/_lib/manage-server";
import { canEditGroupProfile } from "@/app/(manage)/manage/_lib/cgs-permissions";
import { accountManageBasePath, groupManageBasePath } from "@/lib/links";
import { AccountChrome } from "../_components/AccountChrome";
import { AccountHero } from "../_components/AccountHero";
import { AccountTabBar } from "../_components/AccountTabBar";
import { getAccountRouteData, readAccountRouteParams, readOptionalAccountRouteParams, type AccountRouteData } from "../_lib/account-route";

export async function generateMetadata({ params }: { params: Promise<{ did: string }> }): Promise<Metadata> {
  const routeParams = await readOptionalAccountRouteParams(params);
  if (!routeParams) {
    return {
      title: "Profile not found",
      description: "A gentle message for a public profile GainForest cannot find.",
      robots: { index: false, follow: false },
    };
  }

  const account = await getAccountRouteData(routeParams.did, routeParams.urlIdentifier);
  return {
    title: `${account.displayName} — Account`,
    description: account.description ?? `Public GainForest profile for ${account.displayName}.`,
    alternates: { canonical: `/account/${encodeURIComponent(account.urlIdentifier)}` },
  };
}

async function getEditHref(account: AccountRouteData): Promise<string | null> {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) return null;
  if (session.did === account.did) return accountManageBasePath(account.urlIdentifier);
  if (account.kind !== "organization") return null;

  const groups = await fetchUserCgsGroups();
  const membership = groups.find((group) => group.groupDid === account.did);
  if (!membership) return null;

  const permission = canEditGroupProfile({ kind: "group", role: membership.role });
  if (!permission.allowed) return null;

  return groupManageBasePath(account.urlIdentifier || membership.handle || account.did);
}

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ did: string }>;
}) {
  const { did, urlIdentifier } = await readAccountRouteParams(params);
  const account = await getAccountRouteData(did, urlIdentifier);
  const editHref = await getEditHref(account);

  return (
    <main className="w-full">
      <AccountChrome
        hero={
          <>
            <AccountHero account={account} editHref={editHref} />
            <AccountTabBar did={account.urlIdentifier} accountKind={account.kind} />
          </>
        }
      >
        {children}
      </AccountChrome>
    </main>
  );
}
