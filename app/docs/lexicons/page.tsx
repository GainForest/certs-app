import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SchemaGraph } from "./_components/SchemaGraph";
import { GROUPS } from "./_lib/registry";
import { lexiconDescription, lexiconHref } from "./_lib/types";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.docs");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/docs/lexicons" },
  };
}

export default async function LexiconsOverviewPage() {
  const t = await getTranslations("common.docs");

  return (
    <>
      <h1 className="m-0 mb-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t("title")}
      </h1>
      <p className="m-0 mb-6 max-w-[660px] text-[15.5px] text-muted-foreground">{t("lead")}</p>

      <div className="mb-2">
        <SchemaGraph
          labels={{
            samplingContext: t("graph.samplingContext"),
            measurementOrFact: t("graph.measurementOrFact"),
            audiovisualEvidence: t("graph.audiovisualEvidence"),
          }}
        />
      </div>
      <div className="mb-10 text-center font-mono text-[11px] text-muted-foreground/60">
        {t("starSchemaCaption")}
      </div>

      {GROUPS.map((g) => (
        <section key={g.id} className="mb-8">
          <h2 className="m-0 mb-0.5 border-t border-border pt-6 font-serif text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {g.title}
          </h2>
          <div className="mb-3 text-[13.5px] text-muted-foreground">{t(`sections.${g.id}`)}</div>

          <div className="text-[13.5px]">
            {g.lexicons.map((lex) => (
              <div
                key={lex.id}
                className="flex flex-col gap-1 border-b border-border/60 py-3 sm:flex-row sm:items-start sm:gap-3.5"
              >
                <Link
                  href={lexiconHref(lex.id)}
                  className="font-mono text-[12.5px] text-primary no-underline [overflow-wrap:anywhere] hover:underline sm:basis-[250px]"
                >
                  {lex.id}
                </Link>
                <div className="flex-1 text-muted-foreground">{lexiconDescription(lex)}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
