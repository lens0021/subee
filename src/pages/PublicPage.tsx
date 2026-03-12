import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { FloatingRefreshButton } from "../components/FloatingRefreshButton";
import { PostList } from "../components/PostList";
import { usePublicTimeline } from "../hooks/usePublicTimeline";

interface PublicPageProps {
	instanceUrl: string;
	accessToken: string;
	onSubscribe: (handle: string) => void;
	isSubscribed: (handle: string) => boolean;
	initialScrollY: number;
	scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function PublicPage({
	instanceUrl,
	accessToken,
	onSubscribe,
	isSubscribed,
	initialScrollY,
	scrollContainerRef,
}: PublicPageProps) {
	const { posts, loading, error, fetchMore, refresh } = usePublicTimeline(
		instanceUrl,
		accessToken,
	);

	useEffect(() => {
		fetchMore();
	}, [fetchMore]);

	// Restore scroll once after the first batch of posts loads
	const restoredRef = useRef(false);
	useEffect(() => {
		if (
			!restoredRef.current &&
			!loading &&
			posts.length > 0 &&
			initialScrollY > 0
		) {
			restoredRef.current = true;
			requestAnimationFrame(() =>
				scrollContainerRef.current?.scrollTo(0, initialScrollY),
			);
		}
	}, [loading, posts.length, initialScrollY, scrollContainerRef]);

	return (
		<>
			<FloatingRefreshButton
				onRefresh={refresh}
				scrollContainerRef={scrollContainerRef}
			/>
			<PostList
				posts={posts}
				loading={loading}
				error={error}
				onLoadMore={fetchMore}
				onRefresh={refresh}
				onSubscribe={onSubscribe}
				isSubscribed={isSubscribed}
				instanceUrl={instanceUrl}
				accessToken={accessToken}
				scrollContainerRef={scrollContainerRef}
			/>
		</>
	);
}
