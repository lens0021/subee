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
const fresh = Array.from({ length: 5 }, (_, i) =>
	makeStatus(2001 + i, BASE + (i + 1) * 60_000),
);

const CONTAINER = 'div[aria-hidden="false"]';

// Reopening the app from a cached (stale) feed should poll once automatically
// and stage the new posts as a "N new" pill, with no manual Refresh tap.
test("auto-polls on reopen and shows the 'N new' pill", async ({ page }) => {
	let polledNew = false;
	await page.route(`${INSTANCE}/**`, (route) =>
		route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
	);
	await page.route(`${INSTANCE}/api/v1/accounts/lookup**`, (route) =>
		route.fulfill({ json: account }),
	);
	await page.route(`${INSTANCE}/api/v1/accounts/acc1/statuses**`, (route) => {
		const u = new URL(route.request().url());
		if (u.searchParams.get("since_id")) {
			if (polledNew) return route.fulfill({ json: [] });
			polledNew = true;
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
	// Let the post/cursor caches finish persisting before reopening.
	await page.waitForTimeout(600);

	// Reopen the app (cold start). The cached feed is restored, then a single
	// auto-poll runs because the last poll is stale (never polled yet).
	await page.reload();
	const sub = page.locator(CONTAINER);
	await expect(sub.getByTestId("fab-new")).toBeVisible();
	await expect(sub.getByTestId("fab-new")).toContainText("5 new");
	// The background auto-poll must NOT show the initial-load dots — the cached
	// feed is already present, so it should poll quietly behind the "N new" pill.
	await expect(sub.getByTestId("account-status-grid")).toHaveCount(0);
});

// The reported bug: on reopen the auto-poll fires, and if an account is
// rate-limited (429) the dots used to pop up over the cached feed (the
// showGrid "someFailed" branch). A poll failure must stay silent now.
test("a 429 during the on-open auto-poll does not show the loading dots", async ({
	page,
}) => {
	await page.route(`${INSTANCE}/**`, (route) =>
		route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
	);
	await page.route(`${INSTANCE}/api/v1/accounts/lookup**`, (route) =>
		route.fulfill({ json: account }),
	);
	await page.route(`${INSTANCE}/api/v1/accounts/acc1/statuses**`, (route) => {
		const u = new URL(route.request().url());
		// The on-open poll (since_id) is rate-limited; the initial build is not.
		if (u.searchParams.get("since_id"))
			return route.fulfill({
				status: 429,
				contentType: "application/json",
				body: "{}",
			});
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
	await page.waitForTimeout(600);

	await page.reload();
	const sub = page.locator(CONTAINER);
	// Cached feed shows instantly.
	await expect(sub.locator("[data-post-id]").first()).toBeVisible();
	// Give the auto-poll time to run and 429.
	await page.waitForTimeout(800);
	// No loading dots, and nothing staged (the poll failed, quietly).
	await expect(sub.getByTestId("account-status-grid")).toHaveCount(0);
	await expect(sub.getByTestId("fab-new")).toHaveCount(0);
});
