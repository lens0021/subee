import { describe, expect, it } from "vitest";
import { exportHandles, importHandles, normalizeHandle } from "./subscriptions";

describe("normalizeHandle", () => {
	it("adds @ prefix if missing", () => {
		expect(normalizeHandle("user@mastodon.social")).toBe(
			"@user@mastodon.social",
		);
	});

	it("keeps @ prefix if present", () => {
		expect(normalizeHandle("@user@mastodon.social")).toBe(
			"@user@mastodon.social",
		);
	});
});

describe("exportHandles / importHandles", () => {
	it("round-trips a set of handles", () => {
		const handles = new Set(["@alice@mastodon.social", "@bob@fosstodon.org"]);
		const exported = exportHandles(handles);
		const imported = importHandles(exported);
		expect(imported).toEqual(handles);
	});

	it("imports comma-separated handles", () => {
		const imported = importHandles("@alice@mastodon.social,@bob@fosstodon.org");
		expect(imported.has("@alice@mastodon.social")).toBe(true);
		expect(imported.has("@bob@fosstodon.org")).toBe(true);
	});
});
