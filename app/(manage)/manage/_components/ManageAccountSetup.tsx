"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Building2Icon, ChevronRight, UserIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OnboardingRoleOption = {
  Icon: LucideIcon;
  optionName: string;
  optionDescription: string;
  href: string;
};

function BumicertsMark({ className, alt = "" }: { className?: string; alt?: string }) {
  return (
    <motion.div
      className={cn("relative h-20 w-20", className)}
      transition={{
        duration: 0.75,
        type: "spring",
      }}
      layoutId="bumicerts-icon"
    >
      <Image
        className="drop-shadow-2xl"
        src="/assets/media/images/app-icon.png"
        fill
        alt={alt}
      />
    </motion.div>
  );
}

function OnboardingRoleSelector({
  title,
  description,
  options,
  className,
}: {
  title: string;
  description: string;
  options: OnboardingRoleOption[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center pt-8", className)}>
      <BumicertsMark />
      <h1 className="mt-3 text-center text-xl font-medium">{title}</h1>
      <p className="text-center text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 grid w-full gap-2">
        {options.map((option) => (
          <OnboardingRoleOptionCard key={option.optionName} {...option} />
        ))}
      </div>
    </div>
  );
}

function OnboardingRoleOptionCard({
  href,
  Icon,
  optionName,
  optionDescription,
}: OnboardingRoleOption) {
  return (
    <Button
      asChild
      variant="secondary"
      className="group relative h-auto w-full max-w-md flex-col items-start justify-between rounded-xl shadow-none hover:bg-primary/10"
    >
      <Link href={href}>
        <span
          className="flex items-center gap-1.5 text-2xl italic"
          style={{
            fontFamily: "var(--font-instrument-serif-var)",
            fontStyle: "italic",
          }}
        >
          <Icon className="text-primary opacity-50" />
          {optionName}
        </span>
        <span className="text-left text-muted-foreground text-pretty">
          {optionDescription}
        </span>
        <span className="absolute right-3 top-3 -translate-x-2 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
          <ChevronRight />
        </span>
      </Link>
    </Button>
  );
}

function AccountSetupChoiceStep() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <OnboardingRoleSelector
        className="w-full max-w-md"
        title="Choose your setup"
        description="Pick the kind of profile you want to create on Bumicerts."
        options={[
          {
            href: "/manage?mode=onboard-user",
            Icon: UserIcon,
            optionName: "User",
            optionDescription:
              "Create a personal profile with your avatar, banner, name and bio.",
          },
          {
            href: "/manage?mode=onboard-org",
            Icon: Building2Icon,
            optionName: "Organization",
            optionDescription:
              "Set up your organization profile and let Bumicerts prefill what it can from your website.",
          },
        ]}
      />
    </div>
  );
}

function AccountSetupForm({ kind }: { kind: "user" | "organization" }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <BumicertsMark className="mx-auto h-16 w-16" />
      <div className="space-y-2">
        <h1 className="text-xl font-medium">
          {kind === "organization" ? "Organization setup" : "User setup"}
        </h1>
        <p className="text-sm text-muted-foreground">
          This is the placeholder for the Bumicerts onboarding form. The route and transitions are in place; mutation-backed fields will be ported next.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/manage">Back</Link>
      </Button>
    </div>
  );
}

export function ManageAccountSetup({ mode }: { mode: string | null }) {
  const onboardingKind = mode === "onboard-user" ? "user" : mode === "onboard-org" ? "organization" : null;

  return (
    <motion.div
      className="mx-auto w-full max-w-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <AnimatePresence mode="wait">
        {onboardingKind ? (
          <motion.div
            key={onboardingKind}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AccountSetupForm kind={onboardingKind} />
          </motion.div>
        ) : (
          <motion.div
            key="choice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AccountSetupChoiceStep />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
