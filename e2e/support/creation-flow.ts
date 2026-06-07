import { expect, type Page, type TestInfo } from "@playwright/test";
import { screenshotStep } from "./artifacts";
import { getPdsRecord, parseAtUri, trackCreatedPdsRecord, waitForClaimActivityByTitle, type PdsRepoRecord } from "./pds";

export const E2E_BUMICERT_SCOPE = "Reforestation";
export const E2E_BUMICERT_SHORT_DESCRIPTION =
  "E2E restoration impact summary with field-ready details for reviewers.";
export const E2E_BUMICERT_CONTRIBUTOR = "E2E Steward Organization";

export type CreatedBumicert = {
  title: string;
  uri: string;
  cid: string;
  did: string;
  rkey: string;
  record: PdsRepoRecord;
};

export async function fillBumicertForm(page: Page, testInfo: TestInfo): Promise<CreatedBumicert> {
  const title = `E2E Bumicert ${Date.now()}-${testInfo.workerIndex}-${testInfo.retry}`;

  await page.goto("/manage/bumicerts/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /the basics/i }).first()).toBeVisible({ timeout: 60_000 });
  await screenshotStep(page, testInfo, "create-form-empty");

  await page.locator("#bumicert-title").first().fill(title);
  await page.getByRole("button", { name: E2E_BUMICERT_SCOPE }).first().click();
  await screenshotStep(page, testInfo, "create-basics-complete");

  await page.locator("#summary").first().fill(E2E_BUMICERT_SHORT_DESCRIPTION);
  await page.locator("#description").first().fill(
    "This E2E Bumicert documents restoration work with durable local benefits, clear field evidence, practical follow-up notes, and a simple story that reviewers can understand quickly.",
  );
  await screenshotStep(page, testInfo, "create-story-complete");

  await page.getByPlaceholder(/search e\.g\.|name or/i).first().fill(E2E_BUMICERT_CONTRIBUTOR);
  await screenshotStep(page, testInfo, "create-people-complete");

  await page.locator("label").filter({ hasText: /I confirm I have permission/i }).first().click();
  await page.locator("label").filter({ hasText: /I agree to the/i }).first().click();
  await screenshotStep(page, testInfo, "create-ready-to-publish");

  await page.getByRole("button", { name: /publish bumicert/i }).click();
  await expect(page.getByText(/it’s live|it's live/i).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole("link", { name: /open bumicert/i })).toBeVisible({ timeout: 10_000 });
  await screenshotStep(page, testInfo, "create-published-successfully");

  const record = await waitForClaimActivityByTitle(title);
  const freshRecord = await getPdsRecord(record.uri);
  trackCreatedPdsRecord(freshRecord);
  const parsed = parseAtUri(freshRecord.uri);

  return {
    title,
    uri: freshRecord.uri,
    cid: freshRecord.cid,
    did: parsed.did,
    rkey: parsed.rkey,
    record: freshRecord,
  };
}
