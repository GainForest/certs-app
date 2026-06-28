"use client";

/**
 * Pure, browser-only helpers for preparing observation photos: a tidy display
 * name, a fallback capture date, EXIF date/GPS extraction, and downscaling
 * oversized images so they fit within the PDS blob limit.
 *
 * Shared by the full bulk-add panel (ObservationsClient) and the quick
 * "Add observations" modal so the two stay byte-for-byte consistent.
 */

// Photos larger than this are downscaled before upload; the PDS rejects blobs
// past its own ceiling, and base64-in-JSON proxy writes get unwieldy too.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** The slice of metadata we can recover from a photo's EXIF block. */
export type ImageMetadata = {
  eventDate?: string;
  decimalLatitude?: string;
  decimalLongitude?: string;
};

export function cleanFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

export function dateFromFile(file: File): string {
  const date = file.lastModified ? new Date(file.lastModified) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function parseExifDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function formatCoordinate(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(7)).toString();
}

function rationalAt(view: DataView, offset: number, littleEndian: boolean): number | null {
  if (offset < 0 || offset + 8 > view.byteLength) return null;
  const numerator = view.getUint32(offset, littleEndian);
  const denominator = view.getUint32(offset + 4, littleEndian);
  if (denominator === 0) return null;
  return numerator / denominator;
}

function gpsCoordinate(parts: Array<number | null>, ref: string | null): string | null {
  if (parts.some((part) => part === null)) return null;
  const [degrees, minutes, seconds] = parts as [number, number, number];
  let value = degrees + minutes / 60 + seconds / 3600;
  if (ref === "S" || ref === "W") value *= -1;
  return formatCoordinate(value);
}

type TiffEntry = { tag: number; type: number; count: number; valueOffset: number; inlineOffset: number; size: number };

function parseExifMetadata(buffer: ArrayBuffer): ImageMetadata {
  const view = new DataView(buffer);
  if (view.byteLength < 14 || view.getUint16(0) !== 0xffd8) return {};

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const length = view.getUint16(offset + 2, false);
    if (length < 2) break;
    if (marker === 0xe1 && length >= 8) {
      const exifStart = offset + 4;
      const header = String.fromCharCode(...new Uint8Array(buffer, exifStart, Math.min(6, view.byteLength - exifStart)));
      if (header === "Exif\0\0") {
        const tiffStart = exifStart + 6;
        if (tiffStart + 8 > view.byteLength) return {};
        const littleEndian = view.getUint16(tiffStart, false) === 0x4949;
        if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return {};

        const typeSize = (type: number) => {
          if (type === 1 || type === 2 || type === 7) return 1;
          if (type === 3) return 2;
          if (type === 4 || type === 9) return 4;
          if (type === 5 || type === 10) return 8;
          return 0;
        };
        const readEntries = (ifdOffset: number): TiffEntry[] => {
          const start = tiffStart + ifdOffset;
          if (start < 0 || start + 2 > view.byteLength) return [];
          const count = view.getUint16(start, littleEndian);
          const entries: TiffEntry[] = [];
          for (let index = 0; index < count; index += 1) {
            const entryOffset = start + 2 + index * 12;
            if (entryOffset + 12 > view.byteLength) break;
            const type = view.getUint16(entryOffset + 2, littleEndian);
            const itemCount = view.getUint32(entryOffset + 4, littleEndian);
            const size = typeSize(type) * itemCount;
            entries.push({
              tag: view.getUint16(entryOffset, littleEndian),
              type,
              count: itemCount,
              valueOffset: view.getUint32(entryOffset + 8, littleEndian),
              inlineOffset: entryOffset + 8,
              size,
            });
          }
          return entries;
        };
        const valueOffset = (entry: TiffEntry) => entry.size <= 4 ? entry.inlineOffset : tiffStart + entry.valueOffset;
        const readAscii = (entry: TiffEntry | undefined): string | null => {
          if (!entry) return null;
          const start = valueOffset(entry);
          if (start < 0 || start + entry.count > view.byteLength) return null;
          return String.fromCharCode(...new Uint8Array(buffer, start, entry.count)).replace(/\0+$/, "").trim() || null;
        };
        const readRationals = (entry: TiffEntry | undefined): Array<number | null> => {
          if (!entry) return [];
          const start = valueOffset(entry);
          return Array.from({ length: entry.count }, (_, index) => rationalAt(view, start + index * 8, littleEndian));
        };
        const readLong = (entry: TiffEntry | undefined): number | null => {
          if (!entry) return null;
          const start = valueOffset(entry);
          if (start < 0 || start + 4 > view.byteLength) return null;
          return view.getUint32(start, littleEndian);
        };

        const ifd0 = readEntries(view.getUint32(tiffStart + 4, littleEndian));
        const byTag = (entries: TiffEntry[], tag: number) => entries.find((entry) => entry.tag === tag);
        const exifIfd = readLong(byTag(ifd0, 0x8769));
        const gpsIfd = readLong(byTag(ifd0, 0x8825));
        const exifEntries = exifIfd !== null ? readEntries(exifIfd) : [];
        const gpsEntries = gpsIfd !== null ? readEntries(gpsIfd) : [];

        const date = parseExifDate(readAscii(byTag(exifEntries, 0x9003)) ?? readAscii(byTag(ifd0, 0x0132)));
        const latitude = gpsCoordinate(readRationals(byTag(gpsEntries, 0x0002)), readAscii(byTag(gpsEntries, 0x0001)));
        const longitude = gpsCoordinate(readRationals(byTag(gpsEntries, 0x0004)), readAscii(byTag(gpsEntries, 0x0003)));

        return {
          ...(date ? { eventDate: date } : {}),
          ...(latitude ? { decimalLatitude: latitude } : {}),
          ...(longitude ? { decimalLongitude: longitude } : {}),
        };
      }
    }
    offset += 2 + length;
  }

  return {};
}

export async function imageMetadata(file: File): Promise<ImageMetadata> {
  try {
    return parseExifMetadata(await file.arrayBuffer());
  } catch {
    return {};
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not prepare image."));
    }, mimeType, quality);
  });
}

export async function compressImageIfNeeded(file: File): Promise<{ file: File; compressed: boolean; originalSize: number }> {
  if (file.size <= MAX_IMAGE_BYTES) return { file, compressed: false, originalSize: file.size };

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image.");

  const width = bitmap.width;
  const height = bitmap.height;
  const mimeType = "image/jpeg";
  const extensionless = file.name.replace(/\.[^.]+$/, "") || "observation";

  for (const scale of [1, 0.86, 0.72, 0.6, 0.5, 0.42]) {
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46]) {
      const blob = await canvasToBlob(canvas, mimeType, quality);
      if (blob.size <= MAX_IMAGE_BYTES) {
        return {
          file: new File([blob], `${extensionless}.jpg`, { type: mimeType, lastModified: file.lastModified }),
          compressed: true,
          originalSize: file.size,
        };
      }
    }
  }

  throw new Error("Could not prepare image.");
}
