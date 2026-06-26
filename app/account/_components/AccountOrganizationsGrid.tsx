"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Building2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { accountPath } from "../_lib/account-route";

export type AccountOrganization = {
  did: string;
  identifier: string;
  displayName: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "member";
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export function AccountOrganizationsGrid({ organizations }: { organizations: AccountOrganization[] }) {
  const t = useTranslations("common.accountOrganizations");

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span
          className="mb-4 block text-7xl font-light tracking-tight text-primary/[0.12]"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          0
        </span>
        <div className="mb-3 flex items-center gap-2">
          <Building2Icon className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">{t("emptyEyebrow")}</span>
        </div>
        <p
          className="max-w-sm text-lg text-foreground/60"
          style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
        >
          {t("empty")}
        </p>
      </div>
    );
  }

  return (
    <section className="py-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-stretch gap-4"
      >
        {organizations.map((organization) => (
          <motion.div key={organization.did} variants={cardVariants} className="h-full">
            <OrganizationCard organization={organization} roleLabel={t(`role.${organization.role}`)} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function OrganizationCard({ organization, roleLabel }: { organization: AccountOrganization; roleLabel: string }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = Boolean(organization.avatarUrl) && !imgError;
  const initial = organization.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link
      href={accountPath(organization.identifier)}
      className="group flex h-full w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
    >
      <span className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted">
        {hasImage ? (
          <Image
            src={organization.avatarUrl!}
            alt=""
            fill
            unoptimized
            onError={() => setImgError(true)}
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-base font-bold text-muted-foreground">
            {initial}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-instrument text-xl italic leading-tight text-foreground">
          {organization.displayName}
        </span>
        <span className="mt-1 inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
          {roleLabel}
        </span>
      </span>
    </Link>
  );
}
