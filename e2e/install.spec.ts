import { test, expect, type Page } from "@playwright/test";

// The service worker is production-only, so this suite covers the part that is
// live in dev: the install affordance in the mobile menu. Chromium never fires
// a real `beforeinstallprompt` here (installability needs a served, secure
// origin), so the event is dispatched by hand.

// Phone-sized: the burger menu holding the install entry is hidden from `sm` up.
test.use({ viewport: { width: 390, height: 844 } });

const mockGraphql = (page: Page) =>
  page.route("**/graphql", (route) => route.fulfill({ json: { data: {} } }));

/** Stands in for the Chromium install event and records whether it was replayed. */
const fireInstallPrompt = (page: Page) =>
  page.evaluate(() => {
    const event = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    (window as unknown as { __installPrompted: boolean }).__installPrompted = false;
    event.prompt = async () => {
      (window as unknown as { __installPrompted: boolean }).__installPrompted = true;
    };
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);
  });

const openMenu = (page: Page) => page.getByRole("button", { name: "Open menu" }).click();

test.beforeEach(async ({ page }) => {
  await mockGraphql(page);
  await page.goto("/");
});

test("the install entry stays hidden until the browser says the app is installable", async ({
  page,
}) => {
  await openMenu(page);
  await expect(page.getByText("Install app")).toBeHidden();
});

test("accepting the install entry replays the browser's own prompt", async ({ page }) => {
  await fireInstallPrompt(page);
  await openMenu(page);

  const install = page.getByText("Install app");
  await expect(install).toBeVisible();
  await install.click();

  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __installPrompted: boolean }).__installPrompted),
    )
    .toBe(true);
  // The native prompt owns the flow from here, so no in-app instructions.
  await expect(page.getByText("Add PugInspect to your home screen")).toBeHidden();
});

test("the manifest advertises a standalone app with installable icons", async ({ page }) => {
  const href = await page.getAttribute('link[rel="manifest"]', "href");
  expect(href).toBeTruthy();

  const manifest = await page.evaluate(async (url) => (await fetch(url!)).json(), href);
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  // Chromium needs a 192px and a 512px icon before it will offer an install.
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  expect(
    manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable"),
  ).toBe(true);
});
