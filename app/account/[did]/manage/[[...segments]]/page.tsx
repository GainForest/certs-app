import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/ui/container";
import { resolveAccountManageAccess } from "@/app/_lib/manage-server";
import { accountTimelinePath } from "@/app/account/_lib/account-route";
import { ManageGroupsClient } from "@/app/(manage)/manage/groups/_components/ManageGroupsClient";
import {
  AudioSection,
  BumicertsSection,
  DroneSection,
  ManageHomeSection,
  NewBumicertSection,
  ObservationsSection,
  ProjectCertsSection,
  ProjectGallerySection,
  ProjectsSection,
  SettingsSection,
  SitesSection,
  TreesSection,
} from "@/app/(manage)/manage/_sections";

export const metadata: Metadata = {
  title: "Manage — GainForest",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ did: string; segments?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function safeDecode(value: string): string {
  let current = value;
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
}

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

export default async function AccountManagePage({ params, searchParams }: PageProps) {
  const { did, segments = [] } = await params;
  const access = await resolveAccountManageAccess(safeDecode(did));
  // Access errors (signed-out / not-member / forbidden / not-found) are handled
  // by the manage layout, which renders the notice instead of these children.
  if (access.status !== "allowed") return null;
  const target = access.target;

  const [first, second, third, ...rest] = segments;
  if (rest.length > 0) notFound();

  if (!first) return <ManageHomeSection target={target} wrapDashboard={false} />;
  if (first === "projects" && !second) return <ProjectsSection target={target} />;
  if (first === "projects" && second && third === "gallery") return <ProjectGallerySection target={target} projectRkey={decodeURIComponent(second)} />;
  if (first === "projects" && second && third === "certs") return <ProjectCertsSection target={target} projectRkey={decodeURIComponent(second)} />;
  if (first === "sites" && !second) return <SitesSection target={target} />;
  if (first === "trees" && !second) return <TreesSection target={target} />;
  if (first === "audio" && !second) return <AudioSection target={target} />;
  if (first === "drone" && !second) return <DroneSection target={target} />;
  if (first === "certs" && !second) return <BumicertsSection target={target} />;
  if (first === "certs" && second === "new") return <NewBumicertSection target={target} searchParams={await searchParams} />;
  if (first === "bumicerts") {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === "string") search.set(key, value);
    }
    const query = search.toString();
    redirect(`${target.basePath}/certs${second === "new" ? "/new" : ""}${query ? `?${query}` : ""}`);
  }
  if (first === "observations" && !second) {
    const params = await searchParams;
    return <ObservationsSection target={target} forProject={firstParam(params.forProject)} />;
  }
  if (first === "settings" && !second) return <SettingsSection target={target} />;
  if (first === "timeline" && !second) {
    if (target.accountKind !== "organization") notFound();
    redirect(accountTimelinePath(target.identifier));
  }
  if (first === "groups" && !second) redirect(`${target.basePath}/organizations`);
  if (first === "organizations" && !second) {
    if (target.kind !== "personal") notFound();
    return (
      <Container className="pt-4 pb-8">
        <div className="mb-6">
          <h1 className="font-instrument text-3xl font-light italic leading-tight tracking-[-0.02em] text-foreground">
            My Organizations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an organization to manage it, or create a new one.
          </p>
        </div>
        <ManageGroupsClient sessionDid={target.did} />
      </Container>
    );
  }

  notFound();
}
