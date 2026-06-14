import type { mastodon } from "masto";
import { useCallback, useRef, useState } from "react";
import { fetchHomeTimeline, PAGE_SIZE } from "../mastodon";

export function usePublicTimeline(instanceUrl: string, accessToken: string) {
	const [posts, setPosts] = useState<mastodon.v1.Status[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const maxIdRef = useRef<string | undefined>(undefined);
	const hasMoreRef = useRef(true);
	const loadingRef = useRef(false);
	// Bumped on every refresh; an in-flight fetchMore/refresh whose captured gen
	// no longer matches is stale (superseded) and must not touch shared state.
	const genRef = useRef(0);

	const fetchMore = useCallback(async () => {
		if (loadingRef.current || !hasMoreRef.current) return;
		const gen = genRef.current;
		loadingRef.current = true;
		setLoading(true);
		setError(null);
		try {
			const results = await fetchHomeTimeline(
				instanceUrl,
				{ limit: PAGE_SIZE, maxId: maxIdRef.current },
				accessToken,
			);
			if (gen !== genRef.current) return; // superseded by a refresh
			if (results.length < PAGE_SIZE) hasMoreRef.current = false;
			if (results.length > 0) {
				maxIdRef.current = results[results.length - 1].id;
				setPosts((prev) => [...prev, ...results]);
			}
		} catch (e) {
			if (gen === genRef.current) setError(String(e));
		} finally {
			if (gen === genRef.current) {
				loadingRef.current = false;
				setLoading(false);
			}
		}
	}, [instanceUrl, accessToken]);

	const refresh = useCallback(async () => {
		const gen = ++genRef.current; // invalidate any in-flight fetchMore
		maxIdRef.current = undefined;
		hasMoreRef.current = true;
		loadingRef.current = true; // hold the guard so fetchMore can't interleave
		setPosts([]);
		setLoading(true);
		setError(null);
		try {
			const results = await fetchHomeTimeline(
				instanceUrl,
				{ limit: PAGE_SIZE },
				accessToken,
			);
			if (gen !== genRef.current) return; // a newer refresh superseded this
			if (results.length < PAGE_SIZE) hasMoreRef.current = false;
			if (results.length > 0) maxIdRef.current = results[results.length - 1].id;
			setPosts(results);
		} catch (e) {
			if (gen === genRef.current) setError(String(e));
		} finally {
			if (gen === genRef.current) {
				loadingRef.current = false;
				setLoading(false);
			}
		}
	}, [instanceUrl, accessToken]);

	return { posts, loading, error, fetchMore, refresh };
}
