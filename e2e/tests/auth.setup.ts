import { mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { test, type Page } from "@playwright/test";
import { attachPageVideo } from "../support/artifacts";
import { signInWithConfiguredAccount } from "../support/auth-flow";

const authStatePath = "e2e/.auth/user.json";

test("authenticates configured account and saves browser state", async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  await rm(authStatePath, { force: true });

  const videoDir = testInfo.outputPath("manual-context-videos");
  await mkdir(videoDir, { recursive: true });

  const context = await browser.newContext({ recordVideo: { dir: videoDir } });
  let page: Page | null = null;
  try {
    page = await context.newPage();
    await signInWithConfiguredAccount(page, testInfo);
    await mkdir(dirname(authStatePath), { recursive: true });
    await context.storageState({ path: authStatePath });
  } finally {
    await context.close();
    if (page) await attachPageVideo(page, testInfo, "configured-account-auth");
  }
});
