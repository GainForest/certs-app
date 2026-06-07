import { expect, type Page, type TestInfo } from "@playwright/test";
import { screenshotStep } from "./artifacts";
import { getE2EEnv } from "./env";

function isAppUrl(url: string, appUrl: string): boolean {
  return new URL(url).origin === new URL(appUrl).origin;
}

function isExpectedOAuthUrl(url: URL, appUrl: string, expectedHost: string | null): boolean {
  const appHost = new URL(appUrl).hostname;
  const isExpectedHost = expectedHost
    ? url.hostname === expectedHost || url.hostname.endsWith(`.${expectedHost}`)
    : url.hostname !== appHost;

  return isExpectedHost;
}

function assertSafeAuthenticatedBaseUrl(appUrl: string): void {
  const url = new URL(appUrl);
  if (url.hostname === "local.gainforest.app") {
    throw new Error(
      "Authenticated E2E must not run against local.gainforest.app because that may be a developer's active dev server. Use https://local-e2e.gainforest.app instead.",
    );
  }

  if (url.protocol !== "https:" || !url.hostname.endsWith(".gainforest.app")) {
    throw new Error(
      `Authenticated E2E must run through an HTTPS gainforest.app host so sign-in cookies match production behavior. Got ${appUrl}. For local runs, use https://local-e2e.gainforest.app.`,
    );
  }
}

async function clickFirstVisible(page: Page, labels: RegExp[], timeoutMs = 2_500): Promise<boolean> {
  for (const label of labels) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible({ timeout: timeoutMs }).catch(() => false)) {
      const beforeUrl = page.url();
      try {
        await button.click({ noWaitAfter: true, timeout: 10_000 });
      } catch (error) {
        if (page.url() === beforeUrl) throw error;
      }
      return true;
    }
  }
  return false;
}

async function waitForSignedInSession(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await page.request.get("/api/session").catch(() => null);
        if (!response?.ok()) return false;
        const json = (await response.json().catch(() => null)) as { session?: { isLoggedIn?: boolean } } | null;
        return json?.session?.isLoggedIn === true;
      },
      { timeout: 60_000, intervals: [1_000, 2_000, 3_000] },
    )
    .toBe(true);
}

async function openConfiguredLogin(page: Page, testInfo: TestInfo): Promise<void> {
  const env = getE2EEnv();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await screenshotStep(page, testInfo, "home-signed-out");

  const loginUrl = new URL("/login", process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "https://auth.gainforest.app");
  loginUrl.searchParams.set("returnTo", `${env.appUrl.replace(/\/$/, "")}/manage/bumicerts/new`);
  loginUrl.searchParams.set("provider", process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "certs");
  loginUrl.searchParams.set("handle", env.testHandle);

  await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded" });
  await screenshotStep(page, testInfo, "auth-login-started");
}

async function fillPasswordIfVisible(page: Page, password: string): Promise<boolean> {
  const passwordInput = page.locator('input[type="password"]').first();
  if (!(await passwordInput.isVisible({ timeout: 45_000 }).catch(() => false))) return false;

  await passwordInput.fill(password);
  return true;
}

async function fillIdentifierIfVisible(page: Page, handle: string): Promise<void> {
  const identifier = page
    .locator('input[type="email"], input[name*="identifier" i], input[name*="handle" i], input[name*="login" i], input[autocomplete="username"]')
    .first();
  if (await identifier.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const current = await identifier.inputValue().catch(() => "");
    if (!current.trim()) await identifier.fill(handle);
  }
}

async function finishOAuthRedirect(page: Page, appUrl: string, testInfo: TestInfo): Promise<void> {
  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => undefined);

  const authorizeButton = page.getByRole("button", { name: /^authorize$/i }).first();
  const outcome = await Promise.race([
    authorizeButton.waitFor({ state: "visible", timeout: 30_000 }).then(() => "consent" as const).catch(() => "timeout" as const),
    page.waitForURL((url) => isAppUrl(url.toString(), appUrl), { timeout: 30_000 }).then(() => "app" as const).catch(() => "timeout" as const),
  ]);

  if (outcome === "consent") {
    await screenshotStep(page, testInfo, "auth-consent-page");
    await authorizeButton.click();
    await page.waitForURL((url) => isAppUrl(url.toString(), appUrl), { timeout: 60_000 });
  } else if (outcome !== "app") {
    await page.waitForURL((url) => isAppUrl(url.toString(), appUrl), { timeout: 60_000 });
  }

  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => undefined);
  await waitForSignedInSession(page);
  await screenshotStep(page, testInfo, "auth-complete-signed-in");
}

export async function signInWithConfiguredAccount(page: Page, testInfo: TestInfo): Promise<void> {
  const env = getE2EEnv();
  assertSafeAuthenticatedBaseUrl(env.appUrl);

  await openConfiguredLogin(page, testInfo);

  if (!isExpectedOAuthUrl(new URL(page.url()), env.appUrl, env.testPdsDomain)) {
    await page.waitForURL(
      (url) => isExpectedOAuthUrl(url, env.appUrl, env.testPdsDomain),
      { timeout: 60_000, waitUntil: "domcontentloaded" },
    );
  }
  await screenshotStep(page, testInfo, "auth-provider-password-page");

  await fillIdentifierIfVisible(page, env.testHandle);
  const didFillPassword = await fillPasswordIfVisible(page, env.testPassword);
  if (didFillPassword) {
    await screenshotStep(page, testInfo, "auth-password-filled");
    await clickFirstVisible(page, [/^sign in$/i, /^continue$/i, /next/i, /submit/i], 5_000);
  }

  await finishOAuthRedirect(page, env.appUrl, testInfo);
}
