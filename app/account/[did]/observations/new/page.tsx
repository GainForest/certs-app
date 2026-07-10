import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveAccountManageAccess } from "@/app/_lib/manage-server";
import { CanonicalRedirect } from "@/app/account/_components/CanonicalRedirect";
import { AddObservationsPageClient } from "@/app/(manage)/manage/observations/_components/AddObservationsPageClient";
import {
  accountNewObservationPath,
  accountObservationsPath,
  getAccountRouteData,
  readAccountRouteParams,
} from "../../../_lib/account-route";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("upload.observations.newMetadata");
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

type PageProps = {
  params: Promise<{ did: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * Full-page "Add observations" flow — the page equivalent of the old quick-add
 * dialog. Only the account owner / organization manager can add observations,
 * so this mirrors the observations tab's manage gate.
 */
export default async function NewObservationPage({ params, searchParams }: PageProps) {
  const { did, urlIdentifier } = await readAccountRouteParams(params);
  const account = await getAccountRouteData(did, urlIdentifier);
  const sp = await searchParams;
  const rawProject = Array.isArray(sp.forProject) ? sp.forProject[0] : sp.forProject;
  const forProject = typeof rawProject === "string" && rawProject.trim().length > 0 ? rawProject.trim() : null;

  if (urlIdentifier !== account.urlIdentifier) {
    return <CanonicalRedirect to={accountNewObservationPath(account.urlIdentifier, forProject)} />;
  }

  const access = await resolveAccountManageAccess(account.urlIdentifier);
  if (access.status !== "allowed") notFound();

  return (
    <AddObservationsPageClient
      target={access.target}
      projectRef={forProject}
      observationsHref={accountObservationsPath(account.urlIdentifier)}
    />
  );
}
