import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DefBlock } from "../_components/DefBlock";
import { byId, groupOf, KNOWN_IDS, LEXICONS } from "../_lib/registry";
import { lexiconDescription, lexiconHref, mainDefName, shortName } from "../_lib/types";
import type { DocsLabels } from "../_lib/labels";

export const dynamic = "force-static";

type Params = { nsid: string };

export function generateStaticParams(): Params[] {
  return LEXICONS.map((l) => ({ nsid: l.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { nsid } = await params;
  const doc = byId.get(decodeURIComponent(nsid));
  if (!doc) return {};
  return {
    title: doc.id,
    description: lexiconDescription(doc),
    alternates: { canonical: lexiconHref(doc.id) },
  };
}

export default async function LexiconPage({ params }: { params: Promise<Params> }) {
  const { nsid } = await params;
  const doc = byId.get(decodeURIComponent(nsid));
  if (!doc) notFound();

  const t = await getTranslations("common.docs");
  const labels: DocsLabels = {
    values: t("values"),
    members: t("members"),
    output: t("output"),
    key: t("key"),
    required: t("required"),
  };

  const lexId = doc.id;
  const lastDot = lexId.lastIndexOf(".");
  const nsidPrefix = lexId.slice(0, lastDot + 1);
  const nsidName = lexId.slice(lastDot + 1);

  const mainName = mainDefName(doc);
  const otherDefs = Object.entries(doc.defs).filter(([name]) => name !== mainName);

  const group = groupOf(lexId);
  const siblings = group?.lexicons ?? [];
  const idx = siblings.findIndex((l) => l.id === lexId);
  const prev = idx > 0 ? siblings[idx - 1] : undefined;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : undefined;

  const rawSchema = JSON.stringify(doc, null, 2);

  return (
    <>
      {group && (
        <div className="mb-2.5 font-mono text-[11px] text-muted-foreground/60">
          <Link href="/docs/lexicons" className="text-muted-foreground/60 no-underline hover:underline">
            {t("overview")}
          </Link>
          {"  /  "}
          <span className="text-muted-foreground">{group.title}</span>
        </div>
      )}

      <h1 className="m-0 mb-1.5 border-t border-border pt-6 font-serif text-2xl font-semibold tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-3xl">
        <span className="font-mono text-sm font-normal text-muted-foreground/60">{nsidPrefix}</span>
        <span className="font-mono">{nsidName}</span>
      </h1>

      <p className="m-0 mb-6 max-w-[660px] text-[14.5px] text-muted-foreground">{lexiconDescription(doc)}</p>

      <DefBlock name={mainName} def={doc.defs[mainName]} lexiconId={lexId} known={KNOWN_IDS} labels={labels} primary />

      {otherDefs.length > 0 && (
        <h2 className="mb-3 mt-2 border-t border-border pt-5 font-serif text-base font-semibold text-muted-foreground">
          {t("definitions")}
        </h2>
      )}
      {otherDefs.map(([name, def]) => (
        <DefBlock key={name} name={name} def={def} lexiconId={lexId} known={KNOWN_IDS} labels={labels} />
      ))}

      <details className="mb-8 [&>summary]:cursor-pointer [&>summary]:list-none [&>summary]:border-t [&>summary]:border-border [&>summary]:py-1.5 [&>summary]:font-mono [&>summary]:text-[12px] [&>summary]:text-muted-foreground [&>summary::-webkit-details-marker]:hidden">
        <summary>▸ {t("rawSchema")}</summary>
        <pre className="m-0 mt-2 overflow-auto bg-muted/50 p-3.5 font-mono text-[11.5px] leading-relaxed text-foreground">
          {rawSchema}
        </pre>
      </details>

      <div className="flex gap-4 border-t border-border pt-4 text-[12.5px]">
        {prev && (
          <Link href={lexiconHref(prev.id)} className="flex-1 text-primary no-underline">
            <div className="text-[11px] text-muted-foreground/60">← {t("previous")}</div>
            <div className="font-mono">{shortName(prev.id)}</div>
          </Link>
        )}
        {next && (
          <Link href={lexiconHref(next.id)} className="flex-1 text-right text-primary no-underline">
            <div className="text-[11px] text-muted-foreground/60">{t("next")} →</div>
            <div className="font-mono">{shortName(next.id)}</div>
          </Link>
        )}
      </div>
    </>
  );
}
