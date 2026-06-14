import type { RefObject } from "react";
import { useEffect } from "react";
import { FloatingRefreshButton } from "../components/FloatingRefreshButton";
import { PostList } from "../components/PostList";
import { usePublicTimeline } from "../hooks/usePublicTimeline";
import { useRestoreScrollAnchor } from "../hooks/useRestoreScrollAnchor";
import type { ScrollAnchor } from "../types";

interface PublicPageProps {
	instanceUrl: string;
	accessToken: string;
	onSubscribe: (handle: string) => void;
	isSubscribed: (handle: string) => boolean;
	initialAnchor: ScrollAnchor;
	scrollContainerRef: RefObject<HTMLDivElement | null>;
	excludeSubscribed: boolean;
}

export function PublicPage({
	instanceUrl,
	accessToken,
	onSubscribe,
	isSubscribed,
	initialAnchor,
	scrollContainerRef,
	excludeSubscribed,
}: PublicPageProps) {
	const { posts, loading, error, fetchMore, refresh } = usePublicTimeline(
		instanceUrl,
		accessToken,
	);

	useEffect(() => {
		fetchMore();
	}, [fetchMore]);

	useRestoreScrollAnchor(
		scrollContainerRef,
		initialAnchor,
		loading,
		posts.length,
	);

	return (
		<>
			<FloatingRefreshButton onRefresh={refresh} />
			<PostList
				posts={posts}
				excludeSubscribed={excludeSubscribed}
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
