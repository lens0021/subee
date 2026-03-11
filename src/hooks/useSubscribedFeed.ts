import { orderBy } from "lodash";
import type { mastodon } from "masto";
import { useCallback, useRef, useState } from "react";
import { fetchAccountStatuses, lookupAccount, parseHandle } from "../mastodon";

const PAGE_SIZE = 20;

interface AccountCursor {
	accountId: string;
	instanceUrl: string;
	handle: string;
	maxId?: string;
	done: boolean;
}

export function useSubscribedFeed(handles: Set<string>, accessToken: string) {
	const [posts, setPosts] = useState<mastodon.v1.Status[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const cursorsRef = useRef<Map<string, AccountCursor>>(new Map());
	const initializedRef = useRef(false);
	const loadingRef = useRef(false);

	const initCursors = useCallback(async () => {
		const newCursors = new Map<string, AccountCursor>();
		for (const handle of handles) {
			const { username, instanceUrl } = parseHandle(handle);
			try {
				const account = await lookupAccount(instanceUrl, username);
				newCursors.set(handle, {
					accountId: account.id,
					instanceUrl,
					handle,
					done: false,
				});
			} catch {
				// Account not found, skip
			}
		}
		cursorsRef.current = newCursors;
		initializedRef.current = true;
	}, [handles, accessToken]);

	const fetchMore = useCallback(async () => {
		if (loadingRef.current) return;
		loadingRef.current = true;
		setLoading(true);
		setError(null);

		if (!initializedRef.current) {
			await initCursors();
		}

		try {
			const newPosts: mastodon.v1.Status[] = [];

			for (const [handle, cursor] of cursorsRef.current) {
				if (cursor.done) continue;
				try {
					const results = await fetchAccountStatuses(
						cursor.instanceUrl,
						cursor.accountId,
						{ limit: PAGE_SIZE, maxId: cursor.maxId },
					);
					if (results.length < PAGE_SIZE) {
						cursorsRef.current.set(handle, { ...cursor, done: true });
					}
					if (results.length > 0) {
						cursorsRef.current.set(handle, {
							...cursor,
							maxId: results[results.length - 1].id,
						});
						newPosts.push(...results);
					}
				} catch {
					// Skip failed accounts
				}
			}

			setPosts((prev) => {
				const all = [...prev, ...newPosts];
				const deduped = [...new Map(all.map((p) => [p.id, p])).values()];
				return orderBy(deduped, (p) => p.createdAt, "desc");
			});
		} catch (e) {
			setError(String(e));
		} finally {
			loadingRef.current = false;
			setLoading(false);
		}
	}, [initCursors, accessToken]);

	const refresh = useCallback(async () => {
		cursorsRef.current = new Map();
		initializedRef.current = false;
		loadingRef.current = false;
		setPosts([]);
		await fetchMore();
	}, [fetchMore]);

	return { posts, loading, error, fetchMore, refresh };
}
