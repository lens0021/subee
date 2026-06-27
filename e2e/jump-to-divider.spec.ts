import { expect, test } from "@playwright/test";
import {
	authAndSubscribe,
	CONTAINER,
	freshOnce,
	makeFresh,
	mockFeed,
	pullToRefresh,
} from "./helpers";

test("scrolled down, the floating button jumps back to the top", async ({
	page,
}) => {
	// Enough new posts that the flushed feed is several screens tall.
	await mockFeed(page, { since: freshOnce(makeFresh(25)) });
	await authAndSubscribe(page);

	const sub = page.locator(CONTAINER);

	// Pull to poll, then flush the staged posts — this draws the "New posts
	// above" divider and centers the view on it (the seam sits several screens
	// down, so the feed lands scrolled into the middle, not at the top).
	await pullToRefresh(page);
	await expect(sub.getByTestId("fab-new")).toBeVisible();
	await sub.getByTestId("fab-new").click();
	await page.waitForTimeout(800); // let the post-flush auto-scroll settle

	// The seam between new and old posts is marked in place.
	await expect(sub.getByText("New posts above")).toBeVisible();

	// Scroll back up to the very top → at the top and idle, no floating button.
	// (A wheel also cancels any in-flight centering realign, so this is stable.)
	await sub.hover();
	await page.mouse.wheel(0, -60000);
	await page.waitForTimeout(400);
	await expect(sub.getByTestId("fab-top")).toHaveCount(0);

	// Scroll a full screen down → the button becomes a back-to-top jump.
	await page.mouse.wheel(0, 60000);
	await page.waitForTimeout(400);
	await expect(sub.getByTestId("fab-top")).toBeVisible();

	// Tap it → smooth-scroll to the top → the button hides again.
	// Give the smooth-scroll + scroll-listener recompute extra room under load.
	await sub.getByTestId("fab-top").click();
	await expect(sub.getByTestId("fab-top")).toHaveCount(0, { timeout: 10000 });
});
