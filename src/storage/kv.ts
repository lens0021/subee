import localforage from "localforage";

type Wrapped<T> = { v: T; t: number };

const store = localforage.createInstance({
	name: "subee",
	storeName: "kv",
	driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
	description: "subee key-value cache",
});

export async function kvGet<T>(key: string, ttl?: number): Promise<T | null> {
	try {
		const raw = await store.getItem<Wrapped<T>>(key);
		// Require a finite numeric timestamp — a missing/garbage `t` must not be
		// treated as fresh-forever (Date.now() - NaN > ttl is false).
		if (
			!raw ||
			typeof raw !== "object" ||
			!("v" in raw) ||
			typeof raw.t !== "number" ||
			!Number.isFinite(raw.t)
		) {
			return null;
		}
		if (ttl !== undefined && Date.now() - raw.t > ttl) {
			await store.removeItem(key);
			return null;
		}
		return raw.v;
	} catch {
		return null;
	}
}

// Returns true only if the value was durably written, so migration callers can
// avoid deleting the localStorage source after a failed IDB write.
export async function kvSet<T>(key: string, value: T): Promise<boolean> {
	try {
		const wrapped: Wrapped<T> = { v: value, t: Date.now() };
		await store.setItem(key, wrapped);
		return true;
	} catch {
		// Storage full or unavailable — silently skip
		return false;
	}
}

export async function kvDel(key: string): Promise<void> {
	try {
		await store.removeItem(key);
	} catch {
		// ignore
	}
}

// One-time migration: move a legacy localStorage {v,t} entry into IDB. The
// localStorage source is removed only once IDB has the value (or the entry is
// junk/expired), so a failed IDB write doesn't lose recoverable data.
export async function kvMigrateWrapped<T>(
	key: string,
	ttl: number,
): Promise<T | null> {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Wrapped<T>;
		const valid =
			parsed &&
			typeof parsed === "object" &&
			"v" in parsed &&
			typeof parsed.t === "number" &&
			Number.isFinite(parsed.t);
		if (!valid || Date.now() - parsed.t > ttl) {
			localStorage.removeItem(key); // junk or expired — nothing to lose
			return null;
		}
		if (await kvSet(key, parsed.v)) localStorage.removeItem(key);
		return parsed.v;
	} catch {
		return null;
	}
}

// As above, for legacy values stored as a raw (non-enveloped) string.
export async function kvMigrateRaw(key: string): Promise<string | null> {
	try {
		const raw = localStorage.getItem(key);
		if (raw === null) return null;
		if (await kvSet(key, raw)) localStorage.removeItem(key);
		return raw;
	} catch {
		return null;
	}
}

// kvGet, falling back to a one-time localStorage→IDB migration of a legacy
// {v,t} entry. The common read path for the wrapped caches.
export async function kvGetOrMigrate<T>(
	key: string,
	ttl: number,
): Promise<T | null> {
	const fromIdb = await kvGet<T>(key, ttl);
	if (fromIdb !== null) return fromIdb;
	return kvMigrateWrapped<T>(key, ttl);
}
