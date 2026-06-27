import type { mastodon } from "masto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractBlueskyUri, fetchBlueskyStats } from "./bluesky";
import { kvDel } from "./storage/kv";

function status(fields: Partial<mastodon.v1.Status>): mastodon.v1.Status {
	return fields as mastodon.v1.Status;
}

const AT_URI = "at://did:plc:abc123/app.bsky.feed.post/3mp75kuens22h";

describe("extractBlueskyUri", () => {
	it("recovers the at:// URI from a Bridgy Fed ActivityPub uri", () => {
		expect(
			extractBlueskyUri(
				status({ uri: `https://bsky.brid.gy/convert/ap/${AT_URI}` }),
			),
		).toBe(AT_URI);
	});

	it("reconstructs the at:// URI from a bsky.app web link with a DID", () => {
		expect(
			extractBlueskyUri(
				status({
					uri: "https://example.social/users/x/statuses/1",
					url: "https://bsky.brid.gy/r/https://bsky.app/profile/did:plc:abc123/post/3mp75kuens22h",
				}),
			),
		).toBe(AT_URI);
	});

	it("prefers the uri field over url", () => {
		expect(
			extractBlueskyUri(
				status({
					uri: `https://bsky.brid.gy/convert/ap/${AT_URI}`,
					url: "https://bsky.app/profile/did:plc:other/post/zzz",
				}),
			),
		).toBe(AT_URI);
	});

	it("returns null for an ordinary fediverse post", () => {
		expect(
			extractBlueskyUri(
				status({
					uri: "https://mastodon.social/users/a/statuses/123",
					url: "https://mastodon.social/@a/123",
				}),
			),
		).toBeNull();
	});

	it("returns null when a handle-form bsky link carries no DID", () => {
		expect(
			extractBlueskyUri(
				status({ url: "https://bsky.app/profile/alice.bsky.social/post/xyz" }),
			),
		).toBeNull();
	});
});

describe("fetchBlueskyStats", () => {
	beforeEach(async () => {
		await kvDel(`subee:bsky:stats:${AT_URI}`);
		vi.restoreAllMocks();
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns the four engagement counts", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				posts: [{ likeCount: 7, repostCount: 2, replyCount: 1, quoteCount: 3 }],
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		const stats = await fetchBlueskyStats(AT_URI);
		expect(stats).toEqual({
			likeCount: 7,
			repostCount: 2,
			replyCount: 1,
			quoteCount: 3,
		});
		expect(fetchMock).toHaveBeenCalledOnce();
		const calledUrl = fetchMock.mock.calls[0][0] as string;
		expect(calledUrl).toContain("app.bsky.feed.getPosts");
		expect(calledUrl).toContain(encodeURIComponent(AT_URI));

		vi.unstubAllGlobals();
	});

	it("defaults missing counts to 0", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ posts: [{ likeCount: 5 }] }),
			}),
		);
		expect(await fetchBlueskyStats(AT_URI)).toEqual({
			likeCount: 5,
			repostCount: 0,
			replyCount: 0,
			quoteCount: 0,
		});
		vi.unstubAllGlobals();
	});

	it("returns null on a non-ok response", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
		expect(await fetchBlueskyStats(AT_URI)).toBeNull();
		vi.unstubAllGlobals();
	});

	it("returns null when the post is missing from the response", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue({ ok: true, json: async () => ({ posts: [] }) }),
		);
		expect(await fetchBlueskyStats(AT_URI)).toBeNull();
		vi.unstubAllGlobals();
	});

	it("returns null when fetch throws", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
		expect(await fetchBlueskyStats(AT_URI)).toBeNull();
		vi.unstubAllGlobals();
	});
});
