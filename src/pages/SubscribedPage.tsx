import { useEffect } from "react";
import { ExportImport } from "../components/ExportImport";
import { FloatingRefreshButton } from "../components/FloatingRefreshButton";
import { PostList } from "../components/PostList";
import { useSubscribedFeed } from "../hooks/useSubscribedFeed";
import { saveSubscriptions } from "../store/subscriptions";

interface SubscribedPageProps {
	handles: Set<string>;
	instanceUrl: string;
	accessToken: string;
	onHandlesChange: (handles: Set<string>) => void;
	onSubscribe: (handle: string) => void;
	isSubscribed: (handle: string) => boolean;
}

export function SubscribedPage({
	handles,
	instanceUrl,
	accessToken,
	onHandlesChange,
	onSubscribe,
	isSubscribed,
}: SubscribedPageProps) {
	const { posts, loading, error, fetchMore, refresh } = useSubscribedFeed(
		handles,
		accessToken,
	);

	useEffect(() => {
		if (handles.size > 0) fetchMore();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handles.size]);

	const handleImport = async (newHandles: Set<string>) => {
		await saveSubscriptions(newHandles);
		onHandlesChange(newHandles);
	};

	if (handles.size === 0) {
		return (
			<div className="p-8 text-center text-gray-400">
				<p className="text-lg font-medium mb-2">No subscriptions yet</p>
				<p className="text-sm">
					Click "+ Subscribe" on any post to add accounts here.
				</p>
				<div className="mt-4">
					<ExportImport handles={handles} onImport={handleImport} />
				</div>
			</div>
		);
	}

	return (
		<>
			<FloatingRefreshButton onRefresh={refresh} />
			<ExportImport handles={handles} onImport={handleImport} />
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
