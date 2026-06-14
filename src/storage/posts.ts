import { orderBy } from "lodash";
import type { mastodon } from "masto";
import { kvGetOrMigrate, kvSet } from "./kv";

export const POST_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
export const MAX_CACHED_POSTS = 200;

/**
 * Merge two post lists into one deduped, newest-first list. Later items win on
 * duplicate id (so incoming posts replace stale copies). With `cap`, the result
 * is truncated to that many posts (for cache writes).
 */
export function mergePosts(
	existing: mastodon.v1.Status[],
	incoming: mastodon.v1.Status[],
	cap?: number,
): mastodon.v1.Status[] {
	const deduped = [
		...new Map([...existing, ...incoming].map((p) => [p.id, p])).values(),
	];
	const sorted = orderBy(deduped, (p) => p.createdAt, "desc");
	return cap ? sorted.slice(0, cap) : sorted;
}

const postsKey = (instanceUrl: string) => `subee:posts:${instanceUrl}`;

export async function loadPostCache(
	instanceUrl: string,
): Promise<mastodon.v1.Status[] | null> {
	return kvGetOrMigrate<mastodon.v1.Status[]>(
		postsKey(instanceUrl),
		POST_CACHE_TTL,
	);
}

export async function savePostCache(
	instanceUrl: string,
	posts: mastodon.v1.Status[],
): Promise<void> {
	await kvSet(postsKey(instanceUrl), posts);
}
