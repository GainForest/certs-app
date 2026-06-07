import type { Page, TestInfo } from "@playwright/test";

function safeSegment(value: string): string {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

export async function attachPageVideo(
  page: Page,
  testInfo: TestInfo,
  label: string,
): Promise<void> {
  const video = page.video();
  if (!video) return;

  const fileName = `${String(testInfo.attachments.length + 1).padStart(2, "0")}-${safeSegment(label)}.webm`;
  try {
    const path = await video.path();
    await testInfo.attach(fileName, { path, contentType: "video/webm" });
  } catch (error) {
    console.log(`[e2e] Skipped video ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function screenshotStep(
  page: Page,
  testInfo: TestInfo,
  label: string,
): Promise<void> {
  const fileName = `${String(testInfo.attachments.length + 1).padStart(2, "0")}-${safeSegment(label)}.png`;
  try {
    const screenshot = await page.screenshot({ fullPage: true, timeout: 10_000 });
    await testInfo.attach(fileName, { body: screenshot, contentType: "image/png" });
  } catch (error) {
    console.log(`[e2e] Skipped screenshot ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
