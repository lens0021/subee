import { orderBy } from "lodash";
import type { mastodon } from "masto";
import { useCallback, useRef, useState } from "react";
import { fetchAccountStatuses, lookupAccount, parseHandle } from "../mastodon";

const PAGE_SIZE = 20;
const CONCURRENCY = 10;
const FLUSH_EVERY = 20; // update UI after every N accounts complete

interface AccountCursor {
	accountId: string;
	instanceUrl: string;
	handle: string;
	maxId?: string;
	sinceId?: string;
	done: boolean;
}

export interface FeedProgress {
	done: number;
	total: number;
	phase: "resolving" | "loading";
}

// Run tasks with a fixed concurrency limit.
// Safe in single-threaded JS: the index increment is synchronous.
async function concurrent(
	tasks: (() => Promise<void>)[],
	limit: number,
): Promise<void> {
	let i = 0;
	const worker = async () => {
		while (i < tasks.length) {
			await tasks[i++]();
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(limit, tasks.length) }, worker),
	);
}

export function useSubscribedFeed(
	handles: Set<string>,
	instanceUrl: string,
	accessToken: string,
) {
	const [posts, setPosts] = useState<mastodon.v1.Status[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState<FeedProgress | null>(null);
	const cursorsRef = useRef<Map<string, AccountCursor>>(new Map());
	const initializedRef = useRef(false);
	const loadingRef = useRef(false);
	// Buffer for progressive rendering — flushed in batches to avoid
	// running an expensive sort on every single account response.
	const pendingRef = useRef<mastodon.v1.Status[]>([]);

	const flush = useCallback(() => {
		if (pendingRef.current.length === 0) return;
		const toAdd = pendingRef.current.splice(0);
		setPosts((prev) => {
			const all = [...prev, ...toAdd];
			const deduped = [...new Map(all.map((p) => [p.id, p])).values()];
			return orderBy(deduped, (p) => p.createdAt, "desc");
		});
	}, []);

	const initCursors = useCallback(async () => {
		const handlesList = [...handles];
		const newCursors = new Map<string, AccountCursor>();
		let done = 0;

		setProgress({ done: 0, total: handlesList.length, phase: "resolving" });

		await concurrent(
			handlesList.map((handle) => async () => {
				const { username, instanceUrl: remoteInstanceUrl } =
					parseHandle(handle);
				// Look up the account on the user's own instance so that fetched
				// statuses have local IDs and interactions work without extra resolution.
				const acct =
					remoteInstanceUrl === instanceUrl
						? username
						: `${username}@${new URL(remoteInstanceUrl).hostname}`;
				try {
					const account = await lookupAccount(instanceUrl, acct, accessToken);
					newCursors.set(handle, {
						accountId: account.id,
						instanceUrl,
						handle,
						done: false,
					});
				} catch {
					// Account unreachable — skip silently
				}
				setProgress({
					done: ++done,
					total: handlesList.length,
					phase: "resolving",
				});
			}),
			CONCURRENCY,
		);

		cursorsRef.current = newCursors;
		initializedRef.current = true;
	}, [handles, instanceUrl, accessToken]);

	const fetchMore = useCallback(async () => {
		if (loadingRef.current) return;
		loadingRef.current = true;
		setLoading(true);
		setError(null);

		if (!initializedRef.current) {
			await initCursors();
		}

		try {
			const pending = [...cursorsRef.current.values()].filter((c) => !c.done);
			let completed = 0;

			setProgress({ done: 0, total: pending.length, phase: "loading" });

			await concurrent(
				pending.map((cursor) => async () => {
					try {
						const results = await fetchAccountStatuses(
							cursor.instanceUrl,
							cursor.accountId,
							{ limit: PAGE_SIZE, maxId: cursor.maxId },
							accessToken,
						);
						if (results.length < PAGE_SIZE) {
							cursorsRef.current.set(cursor.handle, { ...cursor, done: true });
						}
						if (results.length > 0) {
							cursorsRef.current.set(cursor.handle, {
								...cursor,
								maxId: results[results.length - 1].id,
								// Track the newest post seen for subsequent refreshes
								sinceId: cursor.sinceId ?? results[0].id,
							});
							pendingRef.current.push(...results);
						}
					} catch {
						// Skip failed accounts
					}
					completed++;
					setProgress({
						done: completed,
						total: pending.length,
						phase: "loading",
					});
					if (completed % FLUSH_EVERY === 0) flush();
				}),
				CONCURRENCY,
			);

			flush(); // final flush for any remainder
		} catch (e) {
			setError(String(e));
		} finally {
			loadingRef.current = false;
			setLoading(false);
			setProgress(null);
		}
	}, [initCursors, flush, accessToken]);

	const refresh = useCallback(async () => {
		if (loadingRef.current) return;
		loadingRef.current = true;
		setLoading(true);
		setError(null);

		if (!initializedRef.current) {
			await initCursors();
		}

		try {
			const cursors = [...cursorsRef.current.values()];
			let completed = 0;

			setProgress({ done: 0, total: cursors.length, phase: "loading" });

			await concurrent(
				cursors.map((cursor) => async () => {
					try {
						const results = await fetchAccountStatuses(
							cursor.instanceUrl,
							cursor.accountId,
							{ sinceId: cursor.sinceId, limit: PAGE_SIZE },
							accessToken,
						);
						if (results.length > 0) {
							// Update sinceId to the newest post from this refresh
							cursorsRef.current.set(cursor.handle, {
								...cursor,
								sinceId: results[0].id,
							});
							pendingRef.current.push(...results);
						}
					} catch {
						// Skip failed accounts
					}
					completed++;
					setProgress({
						done: completed,
						total: cursors.length,
						phase: "loading",
					});
					if (completed % FLUSH_EVERY === 0) flush();
				}),
				CONCURRENCY,
			);

			flush();
		} catch (e) {
			setError(String(e));
		} finally {
			loadingRef.current = false;
			setLoading(false);
			setProgress(null);
		}
	}, [initCursors, flush, accessToken]);

	return { posts, loading, error, progress, fetchMore, refresh };
}
