import type { Metadata } from "next";
import { fetchAuthSession } from "@/app/_lib/auth-server";
import {
  AccountBumicertsTabContent,
  AccountDonationsTabContent,
  AccountHomeTabContent,
  AccountSettingsTabContent,
  AccountTimelineTabContent,
} from "@/app/account/_components/AccountTabContent";
import { getAccountRouteData, type AccountRouteData } from "@/app/account/_lib/account-route";

export const metadata: Metadata = {
  title: "Manage Organization — Bumicerts",
  description: "Manage your Bumicerts organization profile and data.",
};

type ManagePageSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type ManageTab = "home" | "bumicerts" | "donations" | "timeline" | "settings";

export default async function ManagePage({ searchParams }: { searchParams: ManagePageSearchParams }) {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) return null;

  const [account, resolvedSearchParams] = await Promise.all([
    getAccountRouteData(session.did, session.did),
    searchParams,
  ]);
  const tab = resolveManageTab(account, resolvedSearchParams.tab);

  switch (tab) {
    case "bumicerts":
      return (
        <AccountBumicertsTabContent
          account={account}
          did={session.did}
          manageAction={{
            href: "/manage/bumicerts",
            label: "Manage your Bumicerts",
            description: "Create, edit, and review your Bumicert stories.",
          }}
        />
      );
    case "donations":
      return <AccountDonationsTabContent account={account} did={session.did} />;
    case "timeline":
      return <AccountTimelineTabContent account={account} did={session.did} />;
    case "settings":
      return <AccountSettingsTabContent account={account} />;
    case "home":
      return <AccountHomeTabContent account={account} />;
  }
}

function resolveManageTab(account: AccountRouteData, value: string | string[] | undefined): ManageTab {
  const tab = Array.isArray(value) ? value[0] : value;

  if (account.kind === "user") {
    switch (tab) {
      case "donations":
      case "settings":
      case "bumicerts":
        return tab;
      default:
        return "bumicerts";
    }
  }

  switch (tab) {
    case "bumicerts":
    case "timeline":
    case "settings":
    case "home":
      return tab;
    default:
      return "home";
  }
}
