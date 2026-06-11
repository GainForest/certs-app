import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAccountRouteData } from "@/app/account/_lib/account-route";
import { ManageDashboard } from "../../_components/ManageDashboard";

export const metadata: Metadata = {
  title: "Manage Group — GainForest",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ did: string }>;
};

export default async function ManageGroupPage({ params }: PageProps) {
  const { did: encodedDid } = await params;
  const did = safeDecode(encodedDid);
  if (!did.startsWith("did:")) notFound();

  const account = await getAccountRouteData(did, did);
  const basePath = `/manage/groups/${encodeURIComponent(did)}`;
  return <ManageDashboard account={account} basePath={basePath} writeRepoDid={did} />;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
