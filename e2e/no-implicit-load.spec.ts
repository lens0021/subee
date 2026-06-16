import { expect, test } from "@playwright/test";
import { CONTAINER, mockFeed, setAuth } from "./helpers";

// Subscribing must NOT auto-load the feed. The empty feed prompts "Slide to
// load", and only an explicit Refresh / pull-to-refresh actually loads it —
// there is no implicit foreground loading anywhere.
test("subscribing does not auto-load — 'Slide to load' until Refresh", async ({
	page,
}) => {
	await mockFeed(page);
	await setAuth(page);
	await page.getByRole("button", { name: "Settings" }).click();
	await page.getByRole("button", { name: /Subscribe to account/i }).click();
	await page.getByRole("textbox").fill("@testuser@mastodon.social");
	await page.getByRole("button", { name: "Add" }).click();

	const sub = page.locator(CONTAINER);
	// Empty feed prompts to load; nothing is fetched on its own.
	await expect(sub.getByText("Slide to load")).toBeVisible();
	await page.waitForTimeout(800); // give any (unwanted) auto-load time to run
	await expect(sub.locator("[data-post-id]")).toHaveCount(0);
	await expect(sub.getByTestId("account-status-grid")).toHaveCount(0);

	// Explicit Refresh runs the first load.
	await sub.getByTestId("fab-refresh").click();
	await expect(sub.locator("[data-post-id]").first()).toBeVisible();
	await expect(sub.getByText("Slide to load")).toHaveCount(0);
});

// With no subscriptions at all the prompt is different ("No subscriptions yet"),
// not the "Slide to load" used for a not-yet-loaded feed.
test("no subscriptions shows a distinct empty message", async ({ page }) => {
	await mockFeed(page);
	await setAuth(page);
	const sub = page.locator(CONTAINER);
	await expect(sub.getByText("No subscriptions yet")).toBeVisible();
	await expect(sub.getByText("Slide to load")).toHaveCount(0);
});
