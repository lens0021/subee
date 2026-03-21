import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import type { PollProgress } from "../hooks/useSubscribedFeed";

interface FloatingRefreshButtonProps {
	onPoll?: () => void;
	onRefresh: () => void;
	scrollContainerRef: RefObject<HTMLElement | null>;
	stagedCount?: number;
	bgProgress?: PollProgress | null;
}

export function FloatingRefreshButton({
	onRefresh,
	onPoll = onRefresh,
	scrollContainerRef,
	stagedCount = 0,
	bgProgress = null,
}: FloatingRefreshButtonProps) {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const el = scrollContainerRef.current;
		if (!el) return;
		const handleScroll = () => setScrolled(el.scrollTop > 200);
		el.addEventListener("scroll", handleScroll, { passive: true });
		return () => el.removeEventListener("scroll", handleScroll);
	}, [scrollContainerRef]);

	if (!scrolled && !bgProgress && stagedCount === 0) return null;

	if (bgProgress) {
		return (
			<div className="fixed top-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gray-700/80 text-gray-200 text-xs px-3 py-1.5 rounded-full shadow backdrop-blur-sm z-30 pointer-events-none">
				<span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
				{bgProgress.done}/{bgProgress.total}
			</div>
		);
	}

	if (stagedCount > 0) {
		return (
			<button
				type="button"
				onClick={onRefresh}
				className="fixed top-16 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-600 transition-colors z-30"
			>
				<FontAwesomeIcon icon={faArrowUp} />
				{stagedCount} new
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={onPoll}
			className="fixed top-16 left-1/2 -translate-x-1/2 bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-700 transition-colors z-30"
		>
			<FontAwesomeIcon icon={faArrowUp} />
			Refresh
		</button>
	);
}
