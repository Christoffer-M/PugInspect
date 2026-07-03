import { test, expect, type Page } from "@playwright/test";

// GraphQL is mocked at the browser boundary — no backend, DB, or third-party
// APIs involved. The smoke suite owns routing, search, paste, and rendering;
// the backend has its own vitest integration tests.
const CHARACTER = { region: "eu", realm: "kazzak", name: "ceases" };
const CHARACTER_URL = `https://puginspect.com/${CHARACTER.region}/${CHARACTER.realm}/${CHARACTER.name}`;

const AVATAR = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

const characterInfo = {
  name: "Ceases",
  realm: "Kazzak",
  region: "eu",
  class: "Hunter",
  race: "Orc",
  activeSpec: "Survival",
  faction: "Horde",
  gender: "male",
  level: 80,
  equippedItemLevel: 291,
  averageItemLevel: 291,
  achievementPoints: 12345,
  guild: { name: "Arctic Avengers", realm: "Kazzak" },
  avatarUrl: AVATAR,
  potentialAlts: [],
};

const mockGraphql = (page: Page) =>
  page.route("**/graphql", async (route) => {
    const { query, variables } = route.request().postDataJSON() as {
      query: string;
      variables?: Record<string, string>;
    };

    let body: unknown;
    if (query.includes("query CharacterSearch")) {
      body = {
        data: {
          characterSuggestions: [
            { name: "Ceases", realm: "Kazzak", region: "eu" },
          ],
        },
      };
    } else if (query.includes("query CharacterInfo")) {
      body =
        variables?.name === CHARACTER.name
          ? { data: { character: characterInfo } }
          : { errors: [{ message: "Character not found" }] };
    } else {
      // raiderIo / raid logs / M+ logs / zone partitions — all hooks are null-safe
      body = { data: { character: null } };
    }

    await route.fulfill({ json: body });
  });

test.beforeEach(async ({ page }) => {
  await mockGraphql(page);
});

const searchInput = (page: Page) => page.getByPlaceholder("Ceases-Kazzak");

const pasteIntoSearch = async (page: Page, text: string) => {
  await page.evaluate((t) => navigator.clipboard.writeText(t), text);
  await searchInput(page).click();
  await page.keyboard.press("ControlOrMeta+v");
};

const expectCharacterPage = async (page: Page) => {
  await expect(page).toHaveURL(
    new RegExp(`/${CHARACTER.region}/${CHARACTER.realm}/${CHARACTER.name}`),
  );
  await expect(page.getByText("Ceases", { exact: true })).toBeVisible();
  await expect(page.getByText("(EU) Kazzak")).toBeVisible();
};

test("search for a known character lands on the character page", async ({
  page,
}) => {
  await page.goto("/");
  await searchInput(page).fill("Ceases");
  await page.getByRole("option", { name: "Ceases-Kazzak" }).click();
  await expectCharacterPage(page);
});

test("pasting a PugInspect URL opens the character, repeat paste gets the annoyed message", async ({
  page,
}) => {
  await page.goto("/");
  await pasteIntoSearch(page, CHARACTER_URL);
  await expectCharacterPage(page);

  await pasteIntoSearch(page, CHARACTER_URL);
  await expect(page.getByText("Already on this character")).toBeVisible();
});

test("a visited character shows up in the search history", async ({
  page,
}) => {
  await page.goto(
    `/${CHARACTER.region}/${CHARACTER.realm}/${CHARACTER.name}`,
  );
  // history entry is added once the character info resolves
  await expectCharacterPage(page);

  await page.getByRole("button", { name: "View recent characters" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByText("Ceases")).toBeVisible();
  await expect(drawer.getByText("Kazzak")).toBeVisible();
  await expect(drawer.getByText("Just now")).toBeVisible();
});

test("unknown character surfaces the error without crashing", async ({
  page,
}) => {
  await page.goto("/eu/kazzak/zzznotarealcharacterzzz");
  await expect(page.getByText("Character not found")).toBeVisible();
  // page shell still renders
  await expect(page.getByText("Raid Progression")).toBeVisible();
});
