import type { mastodon } from "masto";
import { Component, useEffect } from "react";
import type { ReactNode } from "react";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { PostCard } from "./PostCard";

class PostCardErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	render() {
		if (this.state.hasError) return null;
		return this.props.children;
	}
}

interface PostListProps {
	posts: mastodon.v1.Status[];
	loading: boolean;
	error: string | null;
	onLoadMore: () => void;
	onRefresh: () => void;
	onSubscribe: (handle: string) => void;
	isSubscribed: (handle: string) => boolean;
	onMount?: () => void;
}

export function PostList({
	posts,
	loading,
	error,
	onLoadMore,
	onRefresh,
	onSubscribe,
	isSubscribed,
	onMount,
}: PostListProps) {
	useInfiniteScroll(onLoadMore);

	useEffect(() => {
		onMount?.();
	}, [onMount]);

	if (error) {
		return (
			<div className="p-8 text-center">
				<p className="text-red-500 mb-3 text-sm font-mono break-all">{error}</p>
				<button
					type="button"
					onClick={onRefresh}
					className="text-sm px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div>
			{posts.map((status) => (
				<PostCardErrorBoundary key={status.id}>
					<PostCard
						status={status}
						onSubscribe={onSubscribe}
						isSubscribed={isSubscribed}
					/>
				</PostCardErrorBoundary>
			))}
			{loading && (
				<div className="p-4 text-center text-gray-400">Loading...</div>
			)}
			{!loading && posts.length === 0 && (
				<div className="p-8 text-center text-gray-400">
					<p className="mb-3">No posts yet.</p>
					<button
						type="button"
						onClick={onRefresh}
						className="text-sm px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
					>
						Refresh
					</button>
				</div>
			)}
		</div>
	);
}
