import { faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { FloatingButton } from "./floatingButton";

// Centered via mx-auto + w-fit (not -translate-x-1/2) so the buttons are free
// to use `active:scale-95` for a clear pressed state without fighting the
// centering transform.
const PILL = "fixed top-16 inset-x-0 z-30 mx-auto w-fit";

// Shared press feedback: a quick darken + shrink so a tap is obviously
// registered (touch has no :hover). touch-manipulation drops the tap delay.
const PRESS = "transition duration-100 touch-manipulation select-none";

const GRAY = `${PILL} ${PRESS} bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-700 active:bg-gray-800 active:scale-95`;

// Renders the floating button described by `button` (resolved by
// resolveFloatingButton). The same descriptor drives pull-to-refresh, so a pull
// and a tap always invoke the identical action.
export function FloatingRefreshButton({ button }: { button: FloatingButton }) {
	if (!button) return null;

	switch (button.kind) {
		case "top":
			return (
				<button
					type="button"
					data-testid={button.testid}
					onClick={button.onTap}
					className={GRAY}
				>
					<FontAwesomeIcon icon={faArrowUp} />
					Top
				</button>
			);
		case "poll":
			return (
				<div
					data-testid={button.testid}
					className={`${PILL} flex items-center gap-1.5 bg-gray-700/80 text-gray-200 text-xs px-3 py-1.5 rounded-full shadow backdrop-blur-sm pointer-events-none`}
				>
					<span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
					{button.progress.done}/{button.progress.total}
				</div>
			);
		case "new":
			return (
				<button
					type="button"
					data-testid={button.testid}
					onClick={button.onTap}
					className={`${PILL} ${PRESS} bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-blue-600 active:bg-blue-700 active:scale-95`}
				>
					<FontAwesomeIcon icon={faArrowUp} />
					{button.count} new
				</button>
			);
		case "load":
			return (
				<button
					type="button"
					data-testid={button.testid}
					onClick={button.onTap}
					className={GRAY}
				>
					<FontAwesomeIcon icon={faArrowUp} />
					{`Load ${button.count} account${button.count > 1 ? "s" : ""}`}
				</button>
			);
	}
}
