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
// Enough new posts that, at the top, the divider is pushed below the viewport
// (so the button becomes a Refresh prompt rather than a jump).
const fresh = Array.from({ length: 25 }, (_, i) =>
	makeStatus(2001 + i, BASE + (i + 1) * 60_000),
);

const CONTAINER = 'div[aria-hidden="false"]';

test("floating button jumps to the New posts divider by scroll position", async ({
	page,
}) => {
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
	await page.waitForTimeout(600);

	// Scope to the active subscribed tab (the Home tab also renders a button).
	const sub = page.locator(CONTAINER);

	// Poll for new posts, then flush them to create the "New posts" divider.
	await sub.getByTestId("fab-refresh").click();
	await expect(sub.getByTestId("fab-new")).toBeVisible();
	await sub.getByTestId("fab-new").click();
	await page.waitForTimeout(800); // let the post-flush auto-scroll settle

	// At the top: the 25 new posts push the divider below the viewport →
	// floating Refresh prompt.
	await sub.hover();
	await page.mouse.wheel(0, -40000);
	await page.waitForTimeout(400);
	await expect(sub.getByTestId("fab-refresh")).toBeVisible();
	await expect(sub.getByTestId("fab-jump")).toHaveCount(0);

	// At the bottom: the divider is scrolled above the viewport → jump button.
	await page.mouse.wheel(0, 60000);
	await page.waitForTimeout(400);
	await expect(sub.getByTestId("fab-jump")).toBeVisible();

	// Tap jump → the divider becomes visible → the jump button is gone and the
	// floating Refresh is shown again (there is no inline button anymore).
	await sub.getByTestId("fab-jump").click();
	await page.waitForTimeout(800);
	await expect(sub.getByTestId("fab-jump")).toHaveCount(0);
	await expect(sub.getByTestId("fab-refresh")).toBeVisible();
});
