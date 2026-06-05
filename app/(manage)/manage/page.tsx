import type { Metadata } from "next";
import { fetchAuthSession } from "@/app/_lib/auth-server";
import { getAccountRouteData } from "@/app/account/_lib/account-route";
import { ManageDashboard } from "./_components/ManageDashboard";

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
  const mode = Array.isArray(rawMode) ? rawMode[0] ?? null : rawMode ?? null;
  const account = await getAccountRouteData(session.did, session.did);

  return <ManageDashboard account={account} mode={mode} />;
}
