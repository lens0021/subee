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
