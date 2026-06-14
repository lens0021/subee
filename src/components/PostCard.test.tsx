import { render } from "@testing-library/react";
import type { mastodon } from "masto";
import { describe, expect, it } from "vitest";
import { renderContent } from "./PostCard";

function emoji(shortcode: string, staticUrl: string): mastodon.v1.CustomEmoji {
	return {
		shortcode,
		url: staticUrl,
		staticUrl,
		visibleInPicker: true,
	} as mastodon.v1.CustomEmoji;
}

describe("renderContent (post body emoji)", () => {
	it("substitutes a custom emoji shortcode in a text node", () => {
		const { container } = render(
			<div>
				{renderContent("<p>hi :smile:</p>", [
					emoji("smile", "https://ex/smile.png"),
				])}
			</div>,
		);
		const imgs = container.querySelectorAll("img.emoji");
		expect(imgs).toHaveLength(1);
		expect(imgs[0].getAttribute("src")).toBe("https://ex/smile.png");
		expect(container.textContent).toContain("hi");
	});

	it("does not let a hostile emoji URL inject breakout markup", () => {
		const { container } = render(
			<div>
				{renderContent("<p>x :evil:</p>", [
					emoji("evil", '"><a href="https://evil">click</a><img src="y'),
				])}
			</div>,
		);
		// Exactly one emoji img, no injected anchor — the URL is an escaped
		// attribute value, not markup.
		expect(container.querySelectorAll("a")).toHaveLength(0);
		expect(container.querySelectorAll("img")).toHaveLength(1);
	});

	it("does not corrupt a link whose URL contains a :shortcode: substring", () => {
		const { container } = render(
			<div>
				{renderContent('<a href="https://x/Cat#:smile:">link</a>', [
					emoji("smile", "https://ex/smile.png"),
				])}
			</div>,
		);
		const a = container.querySelector("a");
		expect(a?.getAttribute("href")).toBe("https://x/Cat#:smile:");
		// The emoji is in the URL (an attribute), not a text node, so no <img>.
		expect(container.querySelectorAll("img.emoji")).toHaveLength(0);
		expect(a?.textContent).toBe("link");
	});

	it("renders plain content unchanged when there are no emojis", () => {
		const { container } = render(
			<div>{renderContent("<p>just text</p>", [])}</div>,
		);
		expect(container.textContent).toBe("just text");
		expect(container.querySelectorAll("img")).toHaveLength(0);
	});
});
