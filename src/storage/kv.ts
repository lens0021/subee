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
		if (!raw || typeof raw !== "object" || !("v" in raw) || !("t" in raw)) {
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

export async function kvSet<T>(key: string, value: T): Promise<void> {
	try {
		const wrapped: Wrapped<T> = { v: value, t: Date.now() };
		await store.setItem(key, wrapped);
	} catch {
		// Storage full or unavailable — silently skip
	}
}

export async function kvDel(key: string): Promise<void> {
	try {
		await store.removeItem(key);
	} catch {
		// ignore
	}
}

// One-time migration: move a legacy localStorage {v,t} entry into IDB. Reads the
// localStorage value, removes it, TTL-checks the timestamp, and (if valid) writes
// it into IDB. Returns the value or null. The localStorage key is always cleared.
export async function kvMigrateWrapped<T>(
	key: string,
	ttl: number,
): Promise<T | null> {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		localStorage.removeItem(key);
		const parsed = JSON.parse(raw) as Wrapped<T>;
		if (!parsed || typeof parsed !== "object" || !("v" in parsed)) return null;
		if (Date.now() - parsed.t > ttl) return null;
		await kvSet(key, parsed.v);
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
		localStorage.removeItem(key);
		await kvSet(key, raw);
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
