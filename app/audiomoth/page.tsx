import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AudioMothClient } from "./_components/AudioMothClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.audiomoth.meta");

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/audiomoth" },
  };
}

export default function AudioMothPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-20 pt-8 md:pt-12">
      <AudioMothClient />
    </main>
  );
}
