import type { TimelineAttachmentItem } from "@/app/_lib/indexer";

type ParsedDateRange = { start: Date; end: Date };

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizePartialIsoDate(value: string): string {
  if (/^\d{4}$/.test(value)) return `${value}-01-01`;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
}

function parseDatePart(value: string | null | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = new Date(normalizePartialIsoDate(trimmed));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseEvidenceDateRange(value: string | null | undefined): ParsedDateRange | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const [startRaw, endRaw] = trimmed.split("/");
  const start = parseDatePart(startRaw);
  const end = parseDatePart(endRaw ?? startRaw);
  if (!start || !end) return null;

  return start.getTime() <= end.getTime()
    ? { start, end }
    : { start: end, end: start };
}

function formatMonthYear(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

export function formatLinkedWindow(
  entries: TimelineAttachmentItem[],
  locale: string,
): string | null {
  const dates = entries
    .map((entry) => parseDate(entry.record.createdAt ?? entry.metadata.createdAt))
    .filter((date): date is Date => date !== null);

  if (dates.length === 0) return null;

  const first = dates.reduce((current, next) =>
    next.getTime() < current.getTime() ? next : current,
  );
  const last = dates.reduce((current, next) =>
    next.getTime() > current.getTime() ? next : current,
  );

  if (
    first.getUTCFullYear() === last.getUTCFullYear() &&
    first.getUTCMonth() === last.getUTCMonth()
  ) {
    return formatMonthYear(first, locale);
  }

  return `${formatMonthYear(first, locale)} – ${formatMonthYear(last, locale)}`;
}

function formatDateRange(start: Date, end: Date, locale: string): string {
  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth()
  ) {
    return formatMonthYear(start, locale);
  }

  return `${formatMonthYear(start, locale)} – ${formatMonthYear(end, locale)}`;
}

export function formatDateRangeFromValues(
  values: Array<string | null | undefined>,
  locale = "en-US",
): string | null {
  const dates = values.map(parseDate).filter((date): date is Date => date !== null);
  if (dates.length === 0) return null;

  const first = dates.reduce((current, next) =>
    next.getTime() < current.getTime() ? next : current,
  );
  const last = dates.reduce((current, next) =>
    next.getTime() > current.getTime() ? next : current,
  );

  return formatDateRange(first, last, locale);
}

export function formatEvidenceDateRangeFromValues(
  values: Array<string | null | undefined>,
  locale = "en-US",
): string | null {
  const parsedRanges = values
    .map(parseEvidenceDateRange)
    .filter((range): range is ParsedDateRange => range !== null);
  if (parsedRanges.length === 0) return null;

  const first = parsedRanges.reduce((current, next) =>
    next.start.getTime() < current.start.getTime() ? next : current,
  ).start;
  const last = parsedRanges.reduce((current, next) =>
    next.end.getTime() > current.end.getTime() ? next : current,
  ).end;

  return formatDateRange(first, last, locale);
}
