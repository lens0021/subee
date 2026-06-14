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
	// Drives the idle button: when the "New posts" divider is scrolled above the
	// viewport the button jumps to it; otherwise it offers a refresh.
	dividerState?: DividerState;
	onJump?: () => void;
}

// Centered via mx-auto + w-fit (not -translate-x-1/2) so the buttons are free
// to use `active:scale-95` for a clear pressed state without fighting the
// centering transform.
const PILL = "fixed top-16 inset-x-0 z-30 mx-auto w-fit";

// Shared press feedback: a quick darken + shrink so a tap is obviously
// registered (touch has no :hover). touch-manipulation drops the tap delay.
const PRESS = "transition duration-100 touch-manipulation select-none";

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
				className={`${PILL} ${PRESS} bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-600 active:bg-blue-700 active:scale-95`}
			>
				<FontAwesomeIcon icon={faArrowUp} />
				{stagedCount} new
			</button>
		);
	}

	if (dividerState === "above" && onJump) {
		return (
			<button
				type="button"
				data-testid="fab-jump"
				onClick={onJump}
				className={`${PILL} ${PRESS} bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-700 active:bg-gray-800 active:scale-95`}
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
			className={`${PILL} ${PRESS} bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-700 active:bg-gray-800 active:scale-95`}
		>
			<FontAwesomeIcon icon={faArrowUp} />
			Refresh{lastPollTime ? ` · checked ${relativeTime(lastPollTime)}` : ""}
		</button>
	);
}
