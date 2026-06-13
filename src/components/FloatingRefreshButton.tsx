import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import type { PollProgress } from "../hooks/useSubscribedFeed";

function relativeTime(ts: number): string {
	const sec = Math.floor((Date.now() - ts) / 1000);
	if (sec < 60) return "just now";
	if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
	return `${Math.floor(sec / 3600)}h ago`;
}

// Position of the "New posts" divider relative to the viewport.
export type DividerState = "above" | "visible" | "below" | "none";

interface FloatingRefreshButtonProps {
	onPoll?: () => void;
	onRefresh: () => void;
	stagedCount?: number;
	pollProgress?: PollProgress | null;
	lastPollTime?: number | null;
	// Drives the idle button: when the divider is visible an inline refresh in
	// the feed handles it (no floating button); when it's scrolled above the
	// viewport the button jumps to it; otherwise it offers a refresh.
	dividerState?: DividerState;
	onJump?: () => void;
}

const PILL = "fixed top-16 left-1/2 -translate-x-1/2 z-30";

export function FloatingRefreshButton({
	onRefresh,
	onPoll = onRefresh,
	stagedCount = 0,
	pollProgress = null,
	lastPollTime = null,
	dividerState = "none",
	onJump,
}: FloatingRefreshButtonProps) {
	const [, tick] = useState(0);

	// Re-render every 30s to keep relative time fresh
	useEffect(() => {
		if (!lastPollTime) return;
		const id = setInterval(() => tick((n) => n + 1), 30_000);
		return () => clearInterval(id);
	}, [lastPollTime]);

	if (pollProgress) {
		return (
			<div
				data-testid="fab-poll"
				className={`${PILL} flex items-center gap-1.5 bg-gray-700/80 text-gray-200 text-xs px-3 py-1.5 rounded-full shadow backdrop-blur-sm pointer-events-none`}
			>
				<span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
				{pollProgress.done}/{pollProgress.total}
			</div>
		);
	}

	if (stagedCount > 0) {
		return (
			<button
				type="button"
				data-testid="fab-new"
				onClick={onRefresh}
				className={`${PILL} bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-600 transition-colors`}
			>
				<FontAwesomeIcon icon={faArrowUp} />
				{stagedCount} new
			</button>
		);
	}

	// The divider is on screen — the inline refresh above it (in the feed) is the
	// refresh affordance, so no floating button.
	if (dividerState === "visible") return null;

	if (dividerState === "above" && onJump) {
		return (
			<button
				type="button"
				data-testid="fab-jump"
				onClick={onJump}
				className={`${PILL} bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-700 transition-colors`}
			>
				<FontAwesomeIcon icon={faArrowUp} />
				New posts
			</button>
		);
	}

	return (
		<button
			type="button"
			data-testid="fab-refresh"
			onClick={onPoll}
			className={`${PILL} bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-700 transition-colors`}
		>
			<FontAwesomeIcon icon={faArrowUp} />
			Refresh{lastPollTime ? ` · checked ${relativeTime(lastPollTime)}` : ""}
		</button>
	);
}
