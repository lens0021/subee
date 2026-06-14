export type Tab = "public" | "subscribed";

// Scroll restore anchor: the id of the post at the top of the viewport and how
// far it is scrolled past, so the position survives reloads and height changes.
export interface ScrollAnchor {
	id: string | null;
	offset: number;
}
