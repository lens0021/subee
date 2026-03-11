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
}

export function PublicPage({
	instanceUrl,
	accessToken,
	onSubscribe,
	isSubscribed,
	initialScrollY,
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
			requestAnimationFrame(() => window.scrollTo(0, initialScrollY));
		}
	}, [loading, posts.length, initialScrollY]);

	return (
		<>
			<FloatingRefreshButton onRefresh={refresh} />
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
			/>
		</>
	);
}
