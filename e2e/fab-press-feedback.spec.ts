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

function statuses() {
	return Array.from({ length: 10 }, (_, i) => ({
		id: String(2000 - i),
		created_at: new Date(Date.UTC(2026, 0, 2) - i * 60_000).toISOString(),
		content: `<p>Post ${i}</p>`,
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
	}));
}

const CONTAINER = 'div[aria-hidden="false"]';

test("the floating Refresh button shows a pressed state on tap", async ({
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
		if (u.searchParams.get("max_id")) return route.fulfill({ json: [] });
		if (u.searchParams.get("since_id")) return route.fulfill({ json: [] });
		return route.fulfill({ json: statuses() });
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

	const btn = page.locator(CONTAINER).getByTestId("fab-refresh");
	await expect(btn).toBeVisible();

	// Hover (mouse over), read the (non-pressed) background.
	const box = await btn.boundingBox();
	if (!box) throw new Error("no button box");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.waitForTimeout(200);
	const hoverBg = await btn.evaluate(
		(el) => getComputedStyle(el).backgroundColor,
	);

	// Press and hold: the active state must visibly differ from hover.
	await page.mouse.down();
	await page.waitForTimeout(200); // let the 100ms transition settle
	const pressedBg = await btn.evaluate(
		(el) => getComputedStyle(el).backgroundColor,
	);
	await page.mouse.up();

	expect(pressedBg).not.toBe(hoverBg);
});
