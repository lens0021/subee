import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { PollProgress } from "../hooks/useSubscribedFeed";

interface FloatingRefreshButtonProps {
	onPoll?: () => void;
	onRefresh: () => void;
	stagedCount?: number;
	// Subscribed accounts not yet loaded (first login, or freshly subscribed/
	// imported). When > 0 the button advertises the pending load.
	unloadedCount?: number;
	pollProgress?: PollProgress | null;
	// Whether the feed is at the very top. The new-post signals (poll pill,
	// "N new", "Load N") only show here so they never cover what's being read.
	atTop?: boolean;
	// Whether the feed is scrolled a full screen down. When true the button
	// turns into a back-to-top jump (Subscribed only) instead of a feed signal.
	scrolledDown?: boolean;
	onScrollTop?: () => void;
}

// Centered via mx-auto + w-fit (not -translate-x-1/2) so the buttons are free
// to use `active:scale-95` for a clear pressed state without fighting the
// centering transform.
const PILL = "fixed top-16 inset-x-0 z-30 mx-auto w-fit";

// Shared press feedback: a quick darken + shrink so a tap is obviously
// registered (touch has no :hover). touch-manipulation drops the tap delay.
const PRESS = "transition duration-100 touch-manipulation select-none";

const GRAY = `${PILL} ${PRESS} bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-700 active:bg-gray-800 active:scale-95`;

export function FloatingRefreshButton({
	onRefresh,
	onPoll = onRefresh,
	stagedCount = 0,
	unloadedCount = 0,
	pollProgress = null,
	atTop = true,
	scrolledDown = false,
	onScrollTop,
}: FloatingRefreshButtonProps) {
	// Scrolled a screen down: the floating button becomes a back-to-top jump.
	// This wins over the top-only feed signals below — they're hidden down here.
	if (scrolledDown && onScrollTop) {
		return (
			<button
				type="button"
				data-testid="fab-top"
				onClick={onScrollTop}
				className={GRAY}
			>
				<FontAwesomeIcon icon={faArrowUp} />
				Top
			</button>
		);
	}

	// Everything below is a top-of-feed signal — once the user scrolls in, it
	// gives way (to nothing, or to the back-to-top button above).
	if (!atTop) return null;

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

	if (unloadedCount > 0) {
		return (
			<button
				type="button"
				data-testid="fab-refresh"
				onClick={onPoll}
				className={GRAY}
			>
				<FontAwesomeIcon icon={faArrowUp} />
				{`Load ${unloadedCount} account${unloadedCount > 1 ? "s" : ""}`}
			</button>
		);
	}

	return null;
}
