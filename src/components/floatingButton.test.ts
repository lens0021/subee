import { describe, expect, it, vi } from "vitest";
import {
	type FloatingActions,
	type FloatingSignals,
	resolveFloatingButton,
} from "./floatingButton";

const IDLE: FloatingSignals = {
	stagedCount: 0,
	unloadedCount: 0,
	pollProgress: null,
	atTop: true,
	scrolledDown: false,
};

function actions(): FloatingActions {
	return { onFlush: vi.fn(), onLoad: vi.fn(), onScrollTop: vi.fn() };
}

describe("resolveFloatingButton", () => {
	it("shows nothing when idle at the top", () => {
		expect(resolveFloatingButton(IDLE, actions())).toBeNull();
	});

	it("shows the back-to-top jump once scrolled down — and it wins over signals", () => {
		const a = actions();
		const btn = resolveFloatingButton(
			{ ...IDLE, scrolledDown: true, stagedCount: 5, atTop: false },
			a,
		);
		expect(btn?.kind).toBe("top");
		btn?.onTap?.();
		expect(a.onScrollTop).toHaveBeenCalledOnce();
	});

	it("shows the polling pill (non-interactive) while a poll is in flight", () => {
		const btn = resolveFloatingButton(
			{ ...IDLE, pollProgress: { done: 2, total: 5 }, stagedCount: 3 },
			actions(),
		);
		expect(btn?.kind).toBe("poll");
		// A pull on the pill must do nothing — the action is null.
		expect(btn?.onTap).toBeNull();
	});

	it("shows 'N new' and taps to flush", () => {
		const a = actions();
		const btn = resolveFloatingButton({ ...IDLE, stagedCount: 4 }, a);
		expect(btn?.kind).toBe("new");
		expect(btn).toMatchObject({ count: 4 });
		btn?.onTap?.();
		expect(a.onFlush).toHaveBeenCalledOnce();
	});

	it("shows 'Load N' and taps to load", () => {
		const a = actions();
		const btn = resolveFloatingButton({ ...IDLE, unloadedCount: 2 }, a);
		expect(btn?.kind).toBe("load");
		expect(btn).toMatchObject({ count: 2 });
		btn?.onTap?.();
		expect(a.onLoad).toHaveBeenCalledOnce();
	});

	it("prioritises staged posts over unloaded accounts", () => {
		const btn = resolveFloatingButton(
			{ ...IDLE, stagedCount: 1, unloadedCount: 3 },
			actions(),
		);
		expect(btn?.kind).toBe("new");
	});

	it("shows nothing when scrolled mid-feed with no jump target", () => {
		// atTop false, not scrolled a full screen down yet: no signal, no jump.
		expect(
			resolveFloatingButton(
				{ ...IDLE, atTop: false, scrolledDown: false, stagedCount: 2 },
				actions(),
			),
		).toBeNull();
	});
});
