import type { ScrollAnchor } from "../types";

function cssEscape(value: string): string {
	return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value;
}

/**
 * Scroll the container so the anchored post sits at the top again (plus the
 * saved offset into it). Re-aligns over a few frames so late layout settling
 * (content-visibility, lazy images) doesn't leave the position drifted.
 */
export function restoreScrollAnchor(
	el: HTMLElement,
	anchor: ScrollAnchor,
): void {
	if (!anchor.id) return;
	const selector = `[data-post-id="${cssEscape(anchor.id)}"]`;
	let tries = 0;
	let cancelled = false;

	// Abort the re-align loop the moment the user starts scrolling/typing so we
	// don't yank their gesture back to the anchor mid-realign.
	const cancel = () => {
		cancelled = true;
	};
	const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
	const stop = () => {
		for (const e of events) el.removeEventListener(e, cancel);
	};
	for (const e of events)
		el.addEventListener(e, cancel, { passive: true, once: true });

	const align = () => {
		if (cancelled) return stop();
		const target = el.querySelector<HTMLElement>(selector);
		const want = target ? target.offsetTop + anchor.offset : null;
		if (want !== null) {
			if (el.scrollTop !== want) el.scrollTop = want;
		}
		if (++tries < 10) requestAnimationFrame(align);
		else stop();
	};
	requestAnimationFrame(align);
}
