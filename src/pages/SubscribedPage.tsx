import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { AccountStatusGrid } from "../components/AccountStatusGrid";
import { FloatingRefreshButton } from "../components/FloatingRefreshButton";
import { PostList } from "../components/PostList";
import { useSubscribedFeed } from "../hooks/useSubscribedFeed";

interface SubscribedPageProps {
	handles: Set<string>;
	instanceUrl: string;
	accessToken: string;
	onSubscribe: (handle: string) => void;
	isSubscribed: (handle: string) => boolean;
	initialScrollY: number;
	scrollContainerRef: RefObject<HTMLDivElement | null>;
	excludeSubscribed: boolean;
	pinStatusGrid: boolean;
}

export function SubscribedPage({
	handles,
	instanceUrl,
	accessToken,
	onSubscribe,
	isSubscribed,
	initialScrollY,
	scrollContainerRef,
	excludeSubscribed,
	pinStatusGrid,
}: SubscribedPageProps) {
	const {
		posts,
		loading,
		error,
		progress,
		fetchMore,
		refresh,
		accountStatuses,
	} = useSubscribedFeed(handles, instanceUrl, accessToken);

	const hasFailed = [...accountStatuses.values()].some((s) => s === "failed");
	const showGrid =
		accountStatuses.size > 0 && (loading || hasFailed || pinStatusGrid);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run only on mount
	useEffect(() => {
		if (handles.size > 0) fetchMore();
	}, []);

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
			<FloatingRefreshButton
				onRefresh={refresh}
				scrollContainerRef={scrollContainerRef}
			/>
			{showGrid && <AccountStatusGrid statuses={accountStatuses} />}
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
