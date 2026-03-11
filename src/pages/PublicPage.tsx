import { useEffect } from "react";
import { FloatingRefreshButton } from "../components/FloatingRefreshButton";
import { PostList } from "../components/PostList";
import { usePublicTimeline } from "../hooks/usePublicTimeline";

interface PublicPageProps {
	instanceUrl: string;
	accessToken: string;
	onSubscribe: (handle: string) => void;
	isSubscribed: (handle: string) => boolean;
}

export function PublicPage({
	instanceUrl,
	accessToken,
	onSubscribe,
	isSubscribed,
}: PublicPageProps) {
	const { posts, loading, error, fetchMore, refresh } = usePublicTimeline(
		instanceUrl,
		accessToken,
	);

	useEffect(() => {
		fetchMore();
	}, [fetchMore]);

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
			/>
		</>
	);
}
