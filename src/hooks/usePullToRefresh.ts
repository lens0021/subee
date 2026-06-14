import { type RefObject, useEffect, useRef, useState } from "react";

// Damped pull (finger px -> indicator px) needed to arm a refresh, the cap on
// indicator travel, and the resistance factor.
export const PULL_THRESHOLD = 64;
const MAX_PULL = 96;
const DAMP = 0.5;
// Downward finger travel before we commit to (own) the gesture. Below this we
// leave native scrolling alone so a stray touch isn't claimed.
const PULL_SLOP = 8;

/**
 * Pull-to-refresh on a scroll container: when already scrolled to the top,
 * dragging down past PULL_THRESHOLD fires onRefresh on release. Returns the
 * current (damped) pull distance and whether it is armed, for an indicator.
 * Engages only at the very top so normal scrolling is untouched.
 */
export function usePullToRefresh(
	containerRef: RefObject<HTMLElement | null>,
	onRefresh: () => void,
	enabled = true,
): { pullDistance: number; armed: boolean } {
	const [pullDistance, setPullDistance] = useState(0);
	const pullRef = useRef(0);
	const startYRef = useRef(0);
	const pullingRef = useRef(false);
	// Whether we've committed to the gesture (called preventDefault). Once true we
	// keep owning the whole touch so native scroll can't get stuck half-disabled.
	const claimedRef = useRef(false);
	// Keep the latest onRefresh without re-binding the listeners.
	const onRefreshRef = useRef(onRefresh);
	onRefreshRef.current = onRefresh;

	useEffect(() => {
		const el = containerRef.current;
		if (!el || !enabled) return;

		const setDist = (d: number) => {
			pullRef.current = d;
			setPullDistance(d);
		};

		const onStart = (e: TouchEvent) => {
			if (el.scrollTop > 0 || e.touches.length !== 1) return;
			startYRef.current = e.touches[0].clientY;
			pullingRef.current = true;
			claimedRef.current = false;
		};
		const onMove = (e: TouchEvent) => {
			if (!pullingRef.current) return;
			const dy = e.touches[0].clientY - startYRef.current;
			if (!claimedRef.current) {
				// Not committed yet: let native scrolling work. Abandon if the user
				// scrolled the container or is dragging upward; wait past the slop.
				if (dy <= 0 || el.scrollTop > 0) {
					pullingRef.current = false;
					setDist(0);
					return;
				}
				if (dy < PULL_SLOP) return;
				claimedRef.current = true;
			}
			// Committed: own the whole gesture so native scroll can't get stuck.
			// Reversing upward just snaps the indicator toward 0.
			e.preventDefault();
			setDist(Math.min(MAX_PULL, Math.max(0, dy) * DAMP));
		};
		const onEnd = () => {
			if (!pullingRef.current) return;
			pullingRef.current = false;
			claimedRef.current = false;
			if (pullRef.current >= PULL_THRESHOLD) onRefreshRef.current();
			setDist(0);
		};

		el.addEventListener("touchstart", onStart, { passive: true });
		el.addEventListener("touchmove", onMove, { passive: false });
		el.addEventListener("touchend", onEnd, { passive: true });
		el.addEventListener("touchcancel", onEnd, { passive: true });
		return () => {
			el.removeEventListener("touchstart", onStart);
			el.removeEventListener("touchmove", onMove);
			el.removeEventListener("touchend", onEnd);
			el.removeEventListener("touchcancel", onEnd);
		};
	}, [containerRef, enabled]);

	return { pullDistance, armed: pullDistance >= PULL_THRESHOLD };
}
