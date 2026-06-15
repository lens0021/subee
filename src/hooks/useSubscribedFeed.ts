import type { mastodon } from "masto";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	fetchAccountStatuses,
	lookupAccount,
	PAGE_SIZE,
	parseHandle,
} from "../mastodon";
import {
	consumeNativeSyncResults,
	pushNativeSyncState,
} from "../native/android";
import {
	type AccountCursor,
	loadCursorCache,
	saveCursorCache,
} from "../storage/cursors";
import {
	loadPostCache,
	MAX_CACHED_POSTS,
	mergePosts,
	savePostCache,
} from "../storage/posts";
import { concurrent, FEED_CONCURRENCY } from "../sync/concurrent";
import { pollFeed } from "../sync/pollFeed";

const FLUSH_EVERY = 20; // update UI after every N accounts complete

export interface PollProgress {
	done: number;
	total: number;
}

export type AccountLoadStatus =
	| "idle"
	| "resolving"
	| "loading"
	| "done"
	| "failed";

export function useSubscribedFeed(
	handles: Set<string>,
	instanceUrl: string,
	accessToken: string,
) {
	const [posts, setPosts] = useState<mastodon.v1.Status[]>([]);
	// Timestamp of the most recent poll (background or manual); drives the
	// "checked Xm ago" label. Declared here so the mount effect below can seed it
	// from the cursor cache.
	const [lastPollTime, setLastPollTime] = useState<number | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			// Pull in posts fetched by native background polling before reading
			// the cache, so they appear immediately on app launch.
			await consumeNativeSyncResults(instanceUrl);
			const cached = await loadPostCache(instanceUrl);
			if (cancelled) return;
			// Only adopt cache if no posts have arrived yet (network may have
			// raced ahead of disk read on slow IDB).
			if (cached && cached.length > 0)
				setPosts((prev) => (prev.length === 0 ? cached : prev));
			// Reflect how fresh the feed is in the "checked Xm ago" label. Read the
			// cursor cache after consuming native results so a background sync that
			// just delivered counts. Max-merge keeps this correct regardless of
			// whether fetchMore's own write lands before or after this one.
			const cursors = await loadCursorCache(instanceUrl);
			if (cancelled || !cursors) return;
			const maxLastPolledAt = Math.max(
				0,
				...cursors.map(([, c]) => c.lastPolledAt ?? 0),
			);
			if (maxLastPolledAt > 0)
				setLastPollTime((prev) => Math.max(prev ?? 0, maxLastPolledAt));
		})();
		return () => {
			cancelled = true;
		};
	}, [instanceUrl]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [accountStatuses, setAccountStatuses] = useState<
		Map<string, AccountLoadStatus>
	>(new Map());
	const [stagedCount, setStagedCount] = useState(0);
	const [dividerPostId, setDividerPostId] = useState<string | null>(null);
	const [pollProgress, setPollProgress] = useState<PollProgress | null>(null);

	// Always-current mirror of posts state for use inside callbacks
	const postsRef = useRef(posts);
	postsRef.current = posts;

	const cursorsRef = useRef<Map<string, AccountCursor>>(new Map());
	const initializedRef = useRef(false);
	const loadingRef = useRef(false);
	// Buffer for progressive rendering — flushed in batches to avoid
	// running an expensive sort on every single account response.
	const pendingRef = useRef<mastodon.v1.Status[]>([]);
	// Staging buffer — posts fetched by polling, not yet visible in the feed.
	const bufferRef = useRef<mastodon.v1.Status[]>([]);
	const pollingRef = useRef(false);
	// After a 429, don't poll again until this timestamp (ms epoch).
	const rateLimitedUntilRef = useRef(0);

	const flush = useCallback(() => {
		if (pendingRef.current.length === 0) return;
		const toAdd = pendingRef.current.splice(0);
		setPosts((prev) => {
			const sorted = mergePosts(prev, toAdd);
			void savePostCache(instanceUrl, sorted.slice(0, MAX_CACHED_POSTS));
			return sorted;
		});
	}, [instanceUrl]);

	const initCursors = useCallback(async () => {
		const handlesList = [...handles];
		const newCursors = new Map<string, AccountCursor>();

		setAccountStatuses(
			new Map(handlesList.map((h) => [h, "resolving" as AccountLoadStatus])),
		);

		await concurrent(
			handlesList.map((handle) => async () => {
				const { username, instanceUrl: remoteInstanceUrl } =
					parseHandle(handle);
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
					setAccountStatuses((prev) => new Map(prev).set(handle, "loading"));
				} catch {
					setAccountStatuses((prev) => new Map(prev).set(handle, "failed"));
				}
			}),
			FEED_CONCURRENCY,
		);

		// Save tombstones for failed lookups so cache restore can pass allCovered check
		for (const handle of handlesList) {
			if (!newCursors.has(handle)) {
				newCursors.set(handle, {
					accountId: "",
					instanceUrl,
					handle,
					done: true,
				});
			}
		}

		cursorsRef.current = newCursors;
		initializedRef.current = true;
	}, [handles, instanceUrl, accessToken]);

	const poll = useCallback(async () => {
		if (pollingRef.current || loadingRef.current || !initializedRef.current)
			return;
		// Honor a 429 backoff so we stay gentle on the home instance.
		if (Date.now() < rateLimitedUntilRef.current) return;
		pollingRef.current = true;
		try {
			const { newPosts, rateLimitedUntil } = await pollFeed({
				instanceUrl,
				accessToken,
				onProgress: (done, total) => setPollProgress({ done, total }),
				// A background poll must NOT light up the initial-load dots. It
				// shares accountStatuses with the initial load, so ignore the
				// transient "loading"/"failed" a poll produces and only let a
				// success heal a failure left over from the initial load.
				onAccountStatus: (handle, status) => {
					if (status !== "done") return;
					setAccountStatuses((prev) =>
						prev.get(handle) === "failed"
							? new Map(prev).set(handle, "done")
							: prev,
					);
				},
			});
			if (rateLimitedUntil) rateLimitedUntilRef.current = rateLimitedUntil;
			// Merge only the fields pollFeed advances (sinceId/lastPolledAt) into
			// the in-memory cursors. A wholesale replace would clobber a maxId that
			// a concurrent pagination fetchMore advanced, re-fetching a loaded page.
			const refreshed = await loadCursorCache(instanceUrl);
			if (refreshed) {
				const map = cursorsRef.current;
				for (const [handle, c] of refreshed) {
					const cur = map.get(handle);
					map.set(
						handle,
						cur
							? { ...cur, sinceId: c.sinceId, lastPolledAt: c.lastPolledAt }
							: c,
					);
				}
			}
			void pushNativeSyncState(instanceUrl, accessToken);
			if (newPosts.length > 0) {
				bufferRef.current.push(...newPosts);
				setStagedCount(bufferRef.current.length);
			}
		} finally {
			pollingRef.current = false;
			setPollProgress(null);
			setLastPollTime(Date.now());
		}
	}, [instanceUrl, accessToken]);

	const fetchMore = useCallback(async () => {
		// Don't paginate while a poll is in flight — poll refreshes cursors from
		// disk and the two would race on cursorsRef.
		if (loadingRef.current || pollingRef.current) return;
		loadingRef.current = true;
		setLoading(true);
		setError(null);

		let didInit = false;
		if (!initializedRef.current) {
			// Try to restore cursors from cache (IDB; migrates legacy localStorage)
			const cachedCursors = await loadCursorCache(instanceUrl);
			if (!cachedCursors) {
				console.warn(
					"[subee] cursor cache not found or expired for",
					instanceUrl,
				);
			}
			if (cachedCursors) {
				const cursorMap = new Map(cachedCursors);
				const missingHandles = [...handles].filter((h) => !cursorMap.has(h));
				const allCovered = missingHandles.length === 0;
				if (!allCovered) {
					console.warn(
						"[subee] cursor cache miss — missing handles:",
						missingHandles,
					);
				}
				if (allCovered) {
					// Mark all cursors done so page refresh is instant with no API
					// calls. sinceId is preserved so polling can still fetch new posts.
					cursorsRef.current = new Map(
						[...cursorMap.entries()].map(([h, c]) => [h, { ...c, done: true }]),
					);
					initializedRef.current = true;
					const maxLastPolledAt = Math.max(
						0,
						...[...cursorMap.values()].map((c) => c.lastPolledAt ?? 0),
					);
					if (maxLastPolledAt > 0)
						setLastPollTime((prev) => Math.max(prev ?? 0, maxLastPolledAt));
					loadingRef.current = false;
					setLoading(false);
					// No auto-poll on open. The feed shows cached posts plus anything
					// background sync already fetched (consumed on mount / resume);
					// fresh posts come from background sync, pull-to-refresh, or the
					// Refresh button. This keeps opening instant with no loading pill.
					return;
				}
			}
			await initCursors();
			didInit = true;
		}

		// On the initial build into a feed that already shows posts, stage the
		// fetched posts in the buffer ("N new") instead of inserting them while
		// the user may be reading. An empty feed has nothing to disrupt, so it
		// fills directly; pagination (older posts) also appends directly.
		const stageToBuffer = didInit && postsRef.current.length > 0;
		const collected: mastodon.v1.Status[] = [];

		try {
			const pending = [...cursorsRef.current.values()].filter((c) => !c.done);
			if (pending.length === 0) return;
			let completed = 0;

			await concurrent(
				pending.map((cursor) => async () => {
					try {
						const results = await fetchAccountStatuses(
							cursor.instanceUrl,
							cursor.accountId,
							{ limit: PAGE_SIZE, maxId: cursor.maxId },
							accessToken,
						);
						if (results.length > 0) {
							cursorsRef.current.set(cursor.handle, {
								...cursor,
								done: results.length < PAGE_SIZE,
								maxId: results[results.length - 1].id,
								sinceId: cursor.sinceId ?? results[0].id,
							});
							if (stageToBuffer) collected.push(...results);
							else pendingRef.current.push(...results);
						} else {
							cursorsRef.current.set(cursor.handle, { ...cursor, done: true });
						}
						setAccountStatuses((prev) =>
							new Map(prev).set(cursor.handle, "done"),
						);
					} catch {
						setAccountStatuses((prev) =>
							new Map(prev).set(cursor.handle, "failed"),
						);
					}
					completed++;
					if (!stageToBuffer && completed % FLUSH_EVERY === 0) flush();
				}),
				FEED_CONCURRENCY,
			);

			if (stageToBuffer) {
				const known = new Set([
					...postsRef.current.map((p) => p.id),
					...bufferRef.current.map((p) => p.id),
				]);
				const fresh = collected.filter((p) => !known.has(p.id));
				if (fresh.length > 0) {
					bufferRef.current.push(...fresh);
					setStagedCount(bufferRef.current.length);
				}
			} else {
				flush(); // final flush for any remainder
			}
		} catch (e) {
			setError(String(e));
		} finally {
			await saveCursorCache(instanceUrl, [...cursorsRef.current.entries()]);
			void pushNativeSyncState(instanceUrl, accessToken);
			loadingRef.current = false;
			setLoading(false);
		}
	}, [handles, instanceUrl, accessToken, initCursors, flush]);

	// Pull in posts the native background worker fetched while we were closed and
	// surface them as "N new". On a cold start the mount effect already adopts
	// them into the feed; this covers a warm resume where nothing remounts.
	const drainNativeResults = useCallback(async () => {
		const added = await consumeNativeSyncResults(instanceUrl);
		// Keep the "checked Xm ago" label current even when the background poll
		// found nothing new (it still advanced the cursors' lastPolledAt).
		const cursors = await loadCursorCache(instanceUrl);
		if (cursors) {
			const maxLastPolledAt = Math.max(
				0,
				...cursors.map(([, c]) => c.lastPolledAt ?? 0),
			);
			if (maxLastPolledAt > 0)
				setLastPollTime((prev) => Math.max(prev ?? 0, maxLastPolledAt));
		}
		if (added <= 0) return;
		const cached = await loadPostCache(instanceUrl);
		if (!cached) return;
		const known = new Set([
			...postsRef.current.map((p) => p.id),
			...bufferRef.current.map((p) => p.id),
		]);
		const fresh = cached.filter((p) => !known.has(p.id));
		if (fresh.length > 0) {
			bufferRef.current.push(...fresh);
			setStagedCount(bufferRef.current.length);
		}
	}, [instanceUrl]);

	// Returning to the foreground drains posts the background worker fetched
	// while we were away and surfaces them as "N new". It never polls on its own
	// — opening stays instant; fresh posts come from background sync,
	// pull-to-refresh, or the Refresh button.
	useEffect(() => {
		const onVisible = () => {
			if (document.visibilityState !== "visible") return;
			if (!initializedRef.current) return;
			void drainNativeResults();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, [drainNativeResults]);

	// Load accounts that have never been fetched (e.g. importing subscriptions
	// into an empty feed). Only runs while uninitialized, so subscribing a
	// single account to an already-loaded feed stays lazy and is picked up on
	// the next mount, preserving the don't-fetch-on-subscribe behavior.
	useEffect(() => {
		if (handles.size === 0) return;
		if (initializedRef.current || loadingRef.current) return;
		fetchMore();
	}, [handles, fetchMore]);

	const flushBuffer = useCallback(() => {
		if (bufferRef.current.length === 0) return;

		const prevTopId = postsRef.current[0]?.id ?? null;
		setDividerPostId(null);
		pendingRef.current.push(...bufferRef.current.splice(0));
		setStagedCount(0);
		flush();
		if (prevTopId) setDividerPostId(prevTopId);
	}, [flush]);

	return {
		posts,
		loading,
		error,
		fetchMore,
		flushBuffer,
		poll,
		accountStatuses,
		stagedCount,
		dividerPostId,
		pollProgress,
		lastPollTime,
	};
}
