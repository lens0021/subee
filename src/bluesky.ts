import type { mastodon } from "masto";
import { kvGet, kvSet } from "./storage/kv";

// Engagement that lives on the AtProtocol side of a Bridgy Fed post. The bridged
// fediverse copy only ever reflects fediverse-side interactions, so the bulk of
// a bsky.brid.gy post's likes/reposts/replies are invisible without asking the
// origin network directly.
export interface BlueskyStats {
	likeCount: number;
	repostCount: number;
	replyCount: number;
	quoteCount: number;
}

// Bridgy Fed embeds the canonical AtProto record URI (DID and all) verbatim in
// the ActivityPub object id — e.g.
//   https://bsky.brid.gy/convert/ap/at://did:plc:xxx/app.bsky.feed.post/<rkey>
// so the at:// URI (and thus the post's stats) can be recovered without any
// handle resolution. The DID may be did:plc or did:web (dotted/colon'd host).
const AT_URI_RE =
	/(at:\/\/did:[a-zA-Z0-9:._%-]+\/app\.bsky\.feed\.post\/[a-zA-Z0-9]+)/;
// Fallback: a bsky.app web link whose profile segment is a DID. Reconstruct the
// record URI from it. (Handle-form links would need a resolveHandle round-trip;
// bridged posts always carry the DID form in `uri`, so we don't bother.)
const BSKY_WEB_RE =
	/bsky\.app\/profile\/(did:[a-zA-Z0-9:._%-]+)\/post\/([a-zA-Z0-9]+)/;

const STATS_TTL = 30 * 60 * 1000; // 30 min — gentle on the public AppView

const inflight = new Map<string, Promise<BlueskyStats | null>>();

/**
 * Recover the AtProto record URI for a Bridgy Fed (bsky.brid.gy) status, or null
 * if this isn't a bridged Bluesky post. Checks the ActivityPub `uri` (which
 * embeds the at:// URI) first, then the human `url` as a fallback.
 */
export function extractBlueskyUri(status: mastodon.v1.Status): string | null {
	for (const field of [status.uri, status.url]) {
		if (!field) continue;
		const at = field.match(AT_URI_RE);
		if (at) return at[1];
		const web = field.match(BSKY_WEB_RE);
		if (web) return `at://${web[1]}/app.bsky.feed.post/${web[2]}`;
	}
	return null;
}

interface GetPostsResponse {
	posts?: {
		likeCount?: number;
		repostCount?: number;
		replyCount?: number;
		quoteCount?: number;
	}[];
}

/**
 * Fetch like/repost/reply/quote counts for a Bluesky post from the public
 * AppView. Cached for 30 min and deduped per URI so scrolling past the same
 * bridged post doesn't re-hit the API. Returns null on any failure (the post
 * simply shows its fediverse-only counts).
 */
export async function fetchBlueskyStats(
	atUri: string,
): Promise<BlueskyStats | null> {
	const cacheKey = `subee:bsky:stats:${atUri}`;
	const cached = await kvGet<BlueskyStats>(cacheKey, STATS_TTL);
	if (cached) return cached;

	const existing = inflight.get(atUri);
	if (existing) return existing;

	const promise = (async () => {
		try {
			const res = await fetch(
				`https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(atUri)}`,
			);
			if (!res.ok) return null;
			const data = (await res.json()) as GetPostsResponse;
			const post = data.posts?.[0];
			if (!post) return null;
			const stats: BlueskyStats = {
				likeCount: post.likeCount ?? 0,
				repostCount: post.repostCount ?? 0,
				replyCount: post.replyCount ?? 0,
				quoteCount: post.quoteCount ?? 0,
			};
			await kvSet(cacheKey, stats);
			return stats;
		} catch {
			return null;
		} finally {
			inflight.delete(atUri);
		}
	})();

	inflight.set(atUri, promise);
	return promise;
}
