import { expect, test } from "@playwright/test";
import {
  E2E_BUMICERT_CONTRIBUTOR,
  E2E_BUMICERT_SCOPE,
  E2E_BUMICERT_SHORT_DESCRIPTION,
  fillBumicertForm,
} from "../support/creation-flow";
import { getRecordArray } from "../support/pds";

const authStatePath = "e2e/.auth/user.json";

test.use({ storageState: authStatePath });

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

test("creates a bumicert successfully and persists expected direct PDS fields", async ({ page }, testInfo) => {
  const bumicert = await fillBumicertForm(page, testInfo);
  await expect(page.getByRole("link", { name: /open bumicert/i })).toBeVisible();

  expect(bumicert.uri).toContain("/org.hypercerts.claim.activity/");
  expect(bumicert.rkey.length).toBeGreaterThan(0);
  expect(bumicert.record.value.title).toBe(bumicert.title);
  expect(bumicert.record.value.shortDescription).toBe(E2E_BUMICERT_SHORT_DESCRIPTION);
  expect(typeof bumicert.record.value.startDate).toBe("string");
  expect(bumicert.record.value.endDate).toBeUndefined();

  const workScope = bumicert.record.value.workScope;
  expect(isObject(workScope) ? workScope.expression : null).toContain("reforestation");
  const usedTags = isObject(workScope) ? workScope.usedTags : null;
  expect(Array.isArray(usedTags) ? usedTags.length : 0).toBeGreaterThan(0);
  expect(E2E_BUMICERT_SCOPE).toBe("Reforestation");

  const contributors = getRecordArray(bumicert.record, "contributors");
  expect(
    contributors.some((contributor) => {
      const identity = contributor.contributorIdentity;
      return isObject(identity) && identity.identity === E2E_BUMICERT_CONTRIBUTOR;
    }),
  ).toBe(true);
});
