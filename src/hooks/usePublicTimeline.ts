import type { mastodon } from "masto";
import { useCallback, useRef, useState } from "react";
import { fetchHomeTimeline } from "../mastodon";

const PAGE_SIZE = 20;

export function usePublicTimeline(instanceUrl: string, accessToken: string) {
	const [posts, setPosts] = useState<mastodon.v1.Status[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const maxIdRef = useRef<string | undefined>(undefined);
	const hasMoreRef = useRef(true);
	const loadingRef = useRef(false);

	const fetchMore = useCallback(async () => {
		if (loadingRef.current || !hasMoreRef.current) return;
		loadingRef.current = true;
		setLoading(true);
		setError(null);
		try {
			const results = await fetchHomeTimeline(
				instanceUrl,
				{ limit: PAGE_SIZE, maxId: maxIdRef.current },
				accessToken,
			);
			if (results.length < PAGE_SIZE) hasMoreRef.current = false;
			if (results.length > 0) {
				maxIdRef.current = results[results.length - 1].id;
				setPosts((prev) => [...prev, ...results]);
			}
		} catch (e) {
			setError(String(e));
		} finally {
			loadingRef.current = false;
			setLoading(false);
		}
	}, [instanceUrl, accessToken]);

	const refresh = useCallback(async () => {
		maxIdRef.current = undefined;
		hasMoreRef.current = true;
		loadingRef.current = false;
		setPosts([]);
		setLoading(true);
		setError(null);
		try {
			const results = await fetchHomeTimeline(
				instanceUrl,
				{ limit: PAGE_SIZE },
				accessToken,
			);
			if (results.length < PAGE_SIZE) hasMoreRef.current = false;
			if (results.length > 0) maxIdRef.current = results[results.length - 1].id;
			setPosts(results);
		} catch (e) {
			setError(String(e));
		} finally {
			loadingRef.current = false;
			setLoading(false);
		}
	}, [instanceUrl, accessToken]);

	return { posts, loading, error, fetchMore, refresh };
}
