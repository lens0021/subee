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
	const align = () => {
		const target = el.querySelector<HTMLElement>(selector);
		if (target) el.scrollTop = target.offsetTop + anchor.offset;
		if (++tries < 10) requestAnimationFrame(align);
	};
	requestAnimationFrame(align);
}
