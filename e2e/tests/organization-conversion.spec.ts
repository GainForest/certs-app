import { test } from "@playwright/test";
import { convertToOrganization } from "../support/manage-flow";

const authStatePath = "e2e/.auth/user.json";

test.use({ storageState: authStatePath });

test("converts the disposable profile to an organization", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await convertToOrganization(page, testInfo);
});
