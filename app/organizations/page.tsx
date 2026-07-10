import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { localizedAlternates } from "@/app/_lib/seo-metadata";
import { ExploreGridPageSkeleton } from "../_components/PageLoadingSkeletons";
import { fetchSites } from "../_lib/indexer";
import { getRequestOrigin } from "../_lib/request-origin";
import { OrganizationsClient } from "./OrganizationsClient";

export const revalidate = 86400;

const INITIAL_ORGANIZATIONS_TARGET = 24;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketplace.organizations.metadata");
  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    alternates: localizedAlternates("/organizations"),
    openGraph: {
      title,
      description,
      url: "/organizations",
      type: "website",
      images: [{ url: "/og/gainforest-og-2.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: "/og/gainforest-og-2.png", alt: title }],
    },
  };
}

export default async function OrganizationsPage() {
  const [t, origin, initialPage] = await Promise.all([
    getTranslations("marketplace.organizations.metadata"),
    getRequestOrigin(),
    fetchSites(INITIAL_ORGANIZATIONS_TARGET, null, undefined, undefined, "both", {
      sort: "newest",
      featuredBadgesOnly: true,
    }).catch(() => undefined),
  ]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("title"),
    description: t("description"),
    url: new URL("/organizations", origin).toString(),
    isPartOf: {
      "@type": "WebSite",
      name: "GainForest",
      url: new URL("/", origin).toString(),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<ExploreGridPageSkeleton />}>
        <OrganizationsClient initialPage={initialPage} />
      </Suspense>
    </>
  );
}
