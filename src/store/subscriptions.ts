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

/** Convert a profile/actor URL to an "@user@host" handle, or null if it isn't one. */
function handleFromUrl(raw: string): string | null {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return null;
	const segments = url.pathname.split("/").filter(Boolean);
	// Prefer an "@user" (or "@user@host") segment: /@user, /web/@user, /@user/123
	const atSegment = segments.find((s) => s.startsWith("@"));
	let userPart: string | undefined;
	if (atSegment) {
		userPart = atSegment.slice(1);
	} else {
		// ActivityPub actor URL: /users/<name>
		const i = segments.indexOf("users");
		if (i >= 0) userPart = segments[i + 1];
	}
	if (!userPart) return null;
	// "@user@otherhost" profile URLs already carry their own host
	if (userPart.includes("@")) return `@${userPart}`;
	return `@${userPart}@${url.hostname}`;
}

/**
 * Canonicalize subscription input to "@user@host". Accepts plain handles
 * ("@user@host", "user@host", "user") and profile/actor URLs
 * ("https://host/@user", "https://host/@user@otherhost", "https://host/users/user").
 * Also repairs values previously stored as a raw (or "@"-prefixed) URL.
 */
export function normalizeHandle(handle: string): string {
	const trimmed = handle.trim();
	if (!trimmed) return trimmed;
	const urlMatch = trimmed.match(/https?:\/\/\S+/i);
	if (urlMatch) {
		const fromUrl = handleFromUrl(urlMatch[0]);
		if (fromUrl) return fromUrl;
	}
	return `@${trimmed.replace(/^@+/, "")}`;
}

/**
 * Re-normalize all stored handles, repairing any saved in a bad format (e.g. a
 * full profile URL). Idempotent; only writes when something actually changes.
 */
export async function migrateSubscriptions(): Promise<Set<string>> {
	const current = await getSubscriptions();
	const normalized = new Set([...current].map(normalizeHandle));
	if ([...current].join("\n") !== [...normalized].join("\n")) {
		await saveSubscriptions(normalized);
	}
	return normalized;
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
