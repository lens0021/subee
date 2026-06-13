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

	it("converts a Mastodon profile URL to a handle", () => {
		expect(normalizeHandle("https://uri.life/@Feel")).toBe("@Feel@uri.life");
	});

	it("uses the remote host from an @user@host profile URL", () => {
		expect(normalizeHandle("https://uri.life/@Feel@other.social")).toBe(
			"@Feel@other.social",
		);
	});

	it("converts an ActivityPub actor URL to a handle", () => {
		expect(normalizeHandle("https://uri.life/users/Feel")).toBe(
			"@Feel@uri.life",
		);
	});

	it("repairs a value mis-stored as an @-prefixed URL", () => {
		expect(normalizeHandle("@https://uri.life/@Feel")).toBe("@Feel@uri.life");
	});

	it("ignores trailing path and query in a profile URL", () => {
		expect(normalizeHandle("https://uri.life/@Feel/123?x=1")).toBe(
			"@Feel@uri.life",
		);
	});

	it("trims surrounding whitespace", () => {
		expect(normalizeHandle("  user@mastodon.social  ")).toBe(
			"@user@mastodon.social",
		);
	});
});

describe("importHandles with URLs", () => {
	it("normalizes profile URLs on import", () => {
		const imported = importHandles(
			"https://uri.life/@Feel\n@bob@fosstodon.org",
		);
		expect(imported.has("@Feel@uri.life")).toBe(true);
		expect(imported.has("@bob@fosstodon.org")).toBe(true);
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
