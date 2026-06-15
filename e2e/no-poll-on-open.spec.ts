import { expect, test } from "@playwright/test";
import {
	authAndSubscribe,
	CONTAINER,
	freshOnce,
	makeFresh,
	mockFeed,
} from "./helpers";

// Reopening from a cached feed must NOT poll on its own: opening stays instant,
// showing the cached posts with no loading pill. Fresh posts arrive only from
// background sync, pull-to-refresh, or the Refresh button.
test("does not poll on reopen — cached feed shows, no loading", async ({
	page,
}) => {
	// If an on-open poll fired, the since_id route would serve these as "N new".
	await mockFeed(page, { since: freshOnce(makeFresh(5)) });
	await authAndSubscribe(page);

	// Reopen the app (cold start). The cached feed is restored with no poll.
	await page.reload();
	const sub = page.locator(CONTAINER);
	await expect(sub.locator("[data-post-id]").first()).toBeVisible();
	// Give any (unwanted) auto-poll time to run.
	await page.waitForTimeout(800);
	// No poll happened: no progress pill, nothing staged, no loading dots.
	await expect(sub.getByTestId("fab-poll")).toHaveCount(0);
	await expect(sub.getByTestId("fab-new")).toHaveCount(0);
	await expect(sub.getByTestId("account-status-grid")).toHaveCount(0);
	// The idle Refresh button is there for an on-demand poll.
	await expect(sub.getByTestId("fab-refresh")).toBeVisible();
});

// The Refresh button still polls on demand and stages the new posts as "N new",
// quietly (no initial-load dots) — opening no longer does this for you.
test("tapping Refresh polls on demand and stages 'N new'", async ({ page }) => {
	await mockFeed(page, { since: freshOnce(makeFresh(5)) });
	await authAndSubscribe(page);

	await page.reload();
	const sub = page.locator(CONTAINER);
	await expect(sub.getByTestId("fab-refresh")).toBeVisible();

	await sub.getByTestId("fab-refresh").click();
	await expect(sub.getByTestId("fab-new")).toContainText("5 new");
	await expect(sub.getByTestId("account-status-grid")).toHaveCount(0);
});
