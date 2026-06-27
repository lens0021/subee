import type { PollProgress } from "../hooks/useSubscribedFeed";

// The raw feed/scroll signals that decide which floating button (if any) is on
// screen. Kept separate from the actions so the resolution is a pure function.
export interface FloatingSignals {
	stagedCount: number;
	unloadedCount: number;
	pollProgress: PollProgress | null;
	atTop: boolean;
	scrolledDown: boolean;
}

// The callbacks each interactive button fires when tapped.
export interface FloatingActions {
	onFlush: () => void; // "N new" → reveal the staged posts
	onLoad: () => void; // "Load N accounts" → resolve + initial fetch
	onScrollTop: () => void; // "↑ Top" → jump back to the newest
}

// A single description of the floating button currently shown, or null when none
// is. `onTap` is the button's tap action — null for the non-interactive polling
// pill. This is the ONE source of truth: both the renderer
// (FloatingRefreshButton) and the pull-to-refresh gesture consume it, so pulling
// down while a button is shown always does exactly what tapping it would (see
// resolveFloatingButton's callers). Adding a new button state here updates both
// paths at once — they cannot drift apart.
export type FloatingButton =
	| { kind: "top"; testid: "fab-top"; onTap: () => void }
	| { kind: "poll"; testid: "fab-poll"; onTap: null; progress: PollProgress }
	| { kind: "new"; testid: "fab-new"; onTap: () => void; count: number }
	| { kind: "load"; testid: "fab-refresh"; onTap: () => void; count: number }
	| null;

/**
 * Decide which floating button is visible for the given signals. Priority
 * mirrors the on-screen precedence: a back-to-top jump once scrolled down wins
 * over the top-of-feed signals; among those, an in-progress poll, then staged
 * posts, then unloaded accounts. Returns null when nothing should show (idle at
 * the top, or scrolled mid-feed with no jump target).
 */
export function resolveFloatingButton(
	s: FloatingSignals,
	a: FloatingActions,
): FloatingButton {
	if (s.scrolledDown)
		return { kind: "top", testid: "fab-top", onTap: a.onScrollTop };
	if (!s.atTop) return null;
	if (s.pollProgress)
		return {
			kind: "poll",
			testid: "fab-poll",
			onTap: null,
			progress: s.pollProgress,
		};
	if (s.stagedCount > 0)
		return {
			kind: "new",
			testid: "fab-new",
			onTap: a.onFlush,
			count: s.stagedCount,
		};
	if (s.unloadedCount > 0)
		return {
			kind: "load",
			testid: "fab-refresh",
			onTap: a.onLoad,
			count: s.unloadedCount,
		};
	return null;
}
