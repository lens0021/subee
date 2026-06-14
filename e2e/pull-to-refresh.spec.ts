import { expect, test } from "@playwright/test";

const INSTANCE = "https://mastodon.social";
const account = {
	id: "acc1",
	acct: "testuser",
	url: `${INSTANCE}/@testuser`,
	display_name: "Test User",
	avatar: "",
	emojis: [],
	followers_count: 0,
};

function makeStatus(id: number, when: number) {
	return {
		id: String(id),
		created_at: new Date(when).toISOString(),
		content: `<p>Post ${id}</p>`,
		account,
		media_attachments: [],
		emojis: [],
		reblog: null,
		favourited: false,
		reblogged: false,
		replies_count: 0,
		reblogs_count: 0,
		favourites_count: 0,
		spoiler_text: "",
		visibility: "public",
	};
}

const BASE = Date.UTC(2026, 0, 2);
const initial = Array.from({ length: 30 }, (_, i) =>
	makeStatus(2000 - i, BASE - i * 60_000),
);
const fresh = Array.from({ length: 4 }, (_, i) =>
	makeStatus(2001 + i, BASE + (i + 1) * 60_000),
);

const CONTAINER = 'div[aria-hidden="false"]';

// Dispatch a touch sequence on the active scroll container. Splitting move and
// end lets the test observe the indicator before release.
async function dispatchTouch(
	page: import("@playwright/test").Page,
	type: "touchstart" | "touchmove" | "touchend",
	clientY: number,
) {
	await page.evaluate(
		({ sel, type, clientY }) => {
			const el = document.querySelector(sel) as HTMLElement;
			el.scrollTop = 0;
			const touch = new Touch({
				identifier: 1,
				target: el,
				clientX: 60,
				clientY,
			});
			const active = type === "touchend" ? [] : [touch];
			el.dispatchEvent(
				new TouchEvent(type, {
					cancelable: true,
					bubbles: true,
					touches: active,
					targetTouches: active,
					changedTouches: [touch],
				}),
			);
		},
		{ sel: CONTAINER, type, clientY },
	);
}

test("pull down at the top triggers a poll and shows the indicator", async ({
	page,
}) => {
	let polled = false;
	await page.route(`${INSTANCE}/**`, (route) =>
		route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
	);
	await page.route(`${INSTANCE}/api/v1/accounts/lookup**`, (route) =>
		route.fulfill({ json: account }),
	);
	await page.route(`${INSTANCE}/api/v1/accounts/acc1/statuses**`, (route) => {
		const u = new URL(route.request().url());
		if (u.searchParams.get("since_id")) {
			if (polled) return route.fulfill({ json: [] });
			polled = true;
			return route.fulfill({ json: fresh });
		}
		if (u.searchParams.get("max_id")) return route.fulfill({ json: [] });
		return route.fulfill({ json: initial });
	});

	await page.goto("/");
	await page.evaluate(() => {
		localStorage.setItem("subee:accessToken", "fake-token");
		localStorage.setItem("subee:instanceUrl", "https://mastodon.social");
	});
	await page.reload();
	await page.getByRole("button", { name: "Settings" }).click();
	await page.getByRole("button", { name: /Subscribe to account/i }).click();
	await page.getByRole("textbox").fill("@testuser@mastodon.social");
	await page.getByRole("button", { name: "Add" }).click();
	await expect(page.locator("[data-post-id]").first()).toBeVisible();

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
	await page.route(`${INSTANCE}/**`, (route) =>
		route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
	);
	await page.route(`${INSTANCE}/api/v1/accounts/lookup**`, (route) =>
		route.fulfill({ json: account }),
	);
	await page.route(`${INSTANCE}/api/v1/accounts/acc1/statuses**`, (route) => {
		const u = new URL(route.request().url());
		if (u.searchParams.get("since_id")) {
			sinceIdCalls++;
			return route.fulfill({ json: [] });
		}
		if (u.searchParams.get("max_id")) return route.fulfill({ json: [] });
		return route.fulfill({ json: initial });
	});

	await page.goto("/");
	await page.evaluate(() => {
		localStorage.setItem("subee:accessToken", "fake-token");
		localStorage.setItem("subee:instanceUrl", "https://mastodon.social");
	});
	await page.reload();
	await page.getByRole("button", { name: "Settings" }).click();
	await page.getByRole("button", { name: /Subscribe to account/i }).click();
	await page.getByRole("textbox").fill("@testuser@mastodon.social");
	await page.getByRole("button", { name: "Add" }).click();
	await expect(page.locator("[data-post-id]").first()).toBeVisible();

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
