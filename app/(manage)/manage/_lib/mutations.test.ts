import { describe, expect, it } from "vitest";
import { normalizeUploadBlobResult } from "./mutations";

describe("normalizeUploadBlobResult", () => {
  it("keeps already-normalized blob records", () => {
    const ref = { $link: "bafy-normalized" };
    expect(normalizeUploadBlobResult({ $type: "blob", ref, mimeType: "image/png", size: 42 })).toEqual({
      $type: "blob",
      ref,
      mimeType: "image/png",
      size: 42,
    });
  });

  it("unwraps raw PDS uploadBlob responses", () => {
    const blob = { $type: "blob", ref: { $link: "bafy-raw" }, mimeType: "image/jpeg", size: 1234 };
    expect(normalizeUploadBlobResult({ blob })).toEqual({
      ...blob,
      blob,
    });
  });

  it("fails loudly when the upload response has no image reference", () => {
    expect(() => normalizeUploadBlobResult({ blob: { mimeType: "image/webp", size: 1 } })).toThrow(/could not upload this photo/i);
  });
});
