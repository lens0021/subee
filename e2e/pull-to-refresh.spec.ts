import { expect, test } from "@playwright/test";
import {
	authAndSubscribe,
	CONTAINER,
	dispatchTouch,
	freshOnce,
	makeFresh,
	mockFeed,
	pullToRefresh,
} from "./helpers";

test("pull down at the top triggers a poll and shows the indicator", async ({
	page,
}) => {
	await mockFeed(page, { since: freshOnce(makeFresh(4)) });
	await authAndSubscribe(page);

	const sub = page.locator(CONTAINER);

	// Pull down ~160px (damped to >= threshold) without releasing: the indicator
	// shows. start at y=100, move to y=260.
	await dispatchTouch(page, "touchstart", 100);
	await dispatchTouch(page, "touchmove", 160);
	await dispatchTouch(page, "touchmove", 260);
	await expect(sub.getByTestId("pull-indicator")).toBeVisible();

	// Release past the threshold → a poll runs → the new posts arrive as "N new".
	await dispatchTouch(page, "touchend", 260);
	await expect(sub.getByTestId("pull-indicator")).toHaveCount(0);
	await expect(sub.getByTestId("fab-new")).toBeVisible();
	await expect(sub.getByTestId("fab-new")).toContainText("4 new");
});

test("a small pull below the threshold does not trigger a poll", async ({
	page,
}) => {
	let sinceIdCalls = 0;
	await mockFeed(page, {
		since: () => {
			sinceIdCalls++;
			return { json: [] };
		},
	});
	await authAndSubscribe(page);

	// Pull only ~40px (damped to < threshold), then release.
	await dispatchTouch(page, "touchstart", 100);
	await dispatchTouch(page, "touchmove", 140);
	await dispatchTouch(page, "touchend", 140);
	await page.waitForTimeout(400);

	const sub = page.locator(CONTAINER);
	await expect(sub.getByTestId("pull-indicator")).toHaveCount(0);
	await expect(sub.getByTestId("fab-new")).toHaveCount(0);
	expect(sinceIdCalls).toBe(0);
});

test("pull while 'N new' is staged flushes the buffer instead of polling", async ({
	page,
}) => {
	let sinceCalls = 0;
	await mockFeed(page, {
		since: () => {
			sinceCalls++;
			// Only the first poll yields posts; a re-poll would change nothing, so
			// the divider can only appear if the second pull flushes the buffer.
			return sinceCalls === 1 ? { json: makeFresh(4) } : { json: [] };
		},
	});
	await authAndSubscribe(page);

	const sub = page.locator(CONTAINER);

	// First pull polls → 4 posts staged behind the "N new" button.
	await pullToRefresh(page);
	await expect(sub.getByTestId("fab-new")).toContainText("4 new");
	expect(sinceCalls).toBe(1);

	// A pull while "N new" is up must do exactly what tapping it does: flush the
	// buffer (draw the seam, drop the button) — NOT poll again.
	await pullToRefresh(page);
	await expect(sub.getByText("New posts above")).toBeVisible();
	await expect(sub.getByTestId("fab-new")).toHaveCount(0);
	expect(sinceCalls).toBe(1); // no second poll
});
