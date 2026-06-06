import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchAuthSession } from "@/app/_lib/auth-server";
import { getAccountRouteData } from "@/app/account/_lib/account-route";
import { ManageDashboard } from "./_components/ManageDashboard";
import { parseManageMode, shouldClearDashboardMode } from "./_components/manageDashboardMode";

export const metadata: Metadata = {
  title: "Manage Organization — Bumicerts",
  description: "Manage your Bumicerts organization profile and data.",
};

type ManagePageSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ManagePage({ searchParams }: { searchParams: ManagePageSearchParams }) {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) return null;

  const resolvedSearchParams = await searchParams;
  const rawMode = resolvedSearchParams.mode;
  const account = await getAccountRouteData(session.did, session.did);

  if (shouldClearDashboardMode({ currentKind: account.kind, rawMode })) {
    const nextSearchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (key === "mode" || value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((item) => nextSearchParams.append(key, item));
      } else {
        nextSearchParams.set(key, value);
      }
    }
    const query = nextSearchParams.toString();
    redirect(query ? `/manage?${query}` : "/manage");
  }

  return <ManageDashboard account={account} mode={parseManageMode(rawMode)} />;
}
