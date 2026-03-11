import localforage from "localforage";

const STORAGE_KEY = "subee:subscriptions";

export async function getSubscriptions(): Promise<Set<string>> {
	const stored = await localforage.getItem<string[]>(STORAGE_KEY);
	return new Set(stored ?? []);
}

export async function saveSubscriptions(handles: Set<string>): Promise<void> {
	await localforage.setItem(STORAGE_KEY, [...handles]);
}

export async function addSubscription(handle: string): Promise<Set<string>> {
	const current = await getSubscriptions();
	current.add(normalizeHandle(handle));
	await saveSubscriptions(current);
	return current;
}

export async function removeSubscription(handle: string): Promise<Set<string>> {
	const current = await getSubscriptions();
	current.delete(normalizeHandle(handle));
	await saveSubscriptions(current);
	return current;
}

export function normalizeHandle(handle: string): string {
	return handle.startsWith("@") ? handle : `@${handle}`;
}

export function exportHandles(handles: Set<string>): string {
	return [...handles].join("\n");
}

export function importHandles(text: string): Set<string> {
	return new Set(
		text
			.split(/[\n,]+/)
			.map((h) => h.trim())
			.filter(Boolean)
			.map(normalizeHandle),
	);
}
