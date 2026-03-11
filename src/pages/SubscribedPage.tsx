import { useEffect, useRef } from "react";
import { FloatingRefreshButton } from "../components/FloatingRefreshButton";
import { PostList } from "../components/PostList";
import { useSubscribedFeed } from "../hooks/useSubscribedFeed";
import type { FeedProgress } from "../hooks/useSubscribedFeed";

interface SubscribedPageProps {
	handles: Set<string>;
	instanceUrl: string;
	accessToken: string;
	onSubscribe: (handle: string) => void;
	isSubscribed: (handle: string) => boolean;
	initialScrollY: number;
}

export function SubscribedPage({
	handles,
	instanceUrl,
	accessToken,
	onSubscribe,
	isSubscribed,
	initialScrollY,
}: SubscribedPageProps) {
	const { posts, loading, error, progress, fetchMore, refresh } =
		useSubscribedFeed(handles, accessToken);

	useEffect(() => {
		if (handles.size > 0) fetchMore();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handles.size]);

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

	if (handles.size === 0) {
		return (
			<div className="p-8 text-center text-gray-400">
				<p className="text-lg font-medium mb-2">No subscriptions yet</p>
				<p className="text-sm">
					Click "+ Subscribe" on any post to add accounts here.
				</p>
			</div>
		);
	}

	return (
		<>
			<FloatingRefreshButton onRefresh={refresh} />
			<PostList
				posts={posts}
				loading={loading}
				error={error}
				progress={progress}
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
