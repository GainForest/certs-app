"use client";

import { Download, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type FieldDoc = {
  field: string;
  description: string;
  format: string;
  required?: boolean;
  helperText?: string;
  helperTone?: "default" | "destructive";
};

const TEMPLATE_DOWNLOADS = [
  { href: "/templates/tree-data-basic-template.csv", download: "tree-data-basic-template.csv", label: "Download basic CSV" },
  { href: "/templates/tree-data-detailed-template.csv", download: "tree-data-detailed-template.csv", label: "Download detailed CSV" },
] as const;

const FIELD_DOCS: FieldDoc[] = [
  { field: "scientificName", description: "Scientific name of the species", format: "Text", required: true },
  { field: "eventDate", description: "Date the tree was recorded", format: "YYYY-MM-DD", required: true },
  { field: "decimalLatitude", description: "GPS latitude", format: "Decimal", required: true },
  { field: "decimalLongitude", description: "GPS longitude", format: "Decimal", required: true },
  { field: "vernacularName", description: "Common or local name", format: "Text" },
  { field: "recordedBy", description: "Name of recorder", format: "Text" },
  { field: "locality", description: "Site or location name", format: "Text" },
  { field: "country", description: "Country where the tree was recorded", format: "Text" },
  { field: "occurrenceRemarks", description: "Notes or comments about the occurrence", format: "Text" },
  { field: "habitat", description: "Habitat or vegetation type", format: "Text" },
  { field: "height", description: "Tree height in meters", format: "Number" },
  { field: "dbh", description: "Diameter at breast height (cm)", format: "Number" },
  { field: "diameter", description: "Basal or stem diameter in centimeters", format: "Number" },
  { field: "canopyCoverPercent", description: "Canopy cover percentage", format: "0-100" },
  { field: "photo_tree", description: "Photo of the whole tree.", format: "Filename or URL", helperText: "For KoboToolbox, upload the matching Media Attachments ZIP with your CSV export" },
  { field: "photo_leaf", description: "Photo of the leaf. Subject part auto-detected.", format: "Filename or URL", helperText: "Kobo private URLs are not needed when the Media Attachments ZIP is provided" },
  { field: "photo_bark", description: "Photo of the bark. Subject part auto-detected.", format: "Filename or URL", helperText: "Kobo private URLs are not needed when the Media Attachments ZIP is provided" },
  { field: "photo_url", description: "Generic photo URL or Kobo filename column. Multiple values may be separated with commas or semicolons.", format: "Filename(s) or URL(s)", helperText: "Subject part is inferred from the column name; generic photos default to whole tree" },
];

export default function TreeDataGuide() {
  return (
    <Accordion type="single" collapsible className="rounded-lg border">
      <AccordionItem value="guide" className="border-b-0">
        <AccordionTrigger className="px-4 hover:no-underline">New to tree data? See accepted fields and download templates</AccordionTrigger>
        <AccordionContent className="px-4">
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Tree data follows <span className="font-semibold text-foreground">GBIF Darwin Core standards</span>. Use the templates below to prepare CSV exports with field names this uploader can map automatically.
          </p>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {TEMPLATE_DOWNLOADS.map((template) => (
              <Button key={template.download} variant="outline" size="sm" asChild>
                <a href={template.href} download={template.download}><Download />{template.label}</a>
              </Button>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[1fr_1.5fr_0.6fr] gap-0 bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Field</span><span>Description</span><span>Format</span>
            </div>
            <div className="divide-y divide-border">
              {FIELD_DOCS.map((doc) => (
                <div key={doc.field} className="grid grid-cols-[1fr_1.5fr_0.6fr] items-start gap-0 px-4 py-2.5">
                  <span className="font-mono text-sm text-foreground">{doc.field}{doc.required && <span className="ml-1 text-destructive">*</span>}</span>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span>{doc.description}</span>
                    {doc.helperText ? (
                      <span className={cn("inline-flex items-center gap-1 text-xs font-medium", doc.helperTone === "destructive" ? "text-destructive" : "text-primary")}>
                        <InfoIcon className="size-3.5 shrink-0" />{doc.helperText}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm text-muted-foreground">{doc.format}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-destructive">*</span> Required field</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function KoboExportGuide() {
  return (
    <Accordion type="single" collapsible className="rounded-lg border">
      <AccordionItem value="kobo-export" className="border-b-0">
        <AccordionTrigger className="px-4 hover:no-underline">Using KoboToolbox? Here&apos;s what to export</AccordionTrigger>
        <AccordionContent className="space-y-4 border-t px-4 pt-4">
          <p className="text-sm leading-relaxed text-muted-foreground">Download both your CSV data export and Media Attachments ZIP, then upload both here so photo filename columns can be matched.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
