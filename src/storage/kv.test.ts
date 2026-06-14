import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	kvDel,
	kvGet,
	kvGetOrMigrate,
	kvMigrateRaw,
	kvMigrateWrapped,
	kvSet,
} from "./kv";

describe("kv storage", () => {
	beforeEach(async () => {
		await kvDel("test:key");
		await kvDel("test:other");
		localStorage.clear();
		vi.useRealTimers();
	});

	it("round-trips a value", async () => {
		await kvSet("test:key", { foo: "bar", n: 42 });
		const got = await kvGet<{ foo: string; n: number }>("test:key");
		expect(got).toEqual({ foo: "bar", n: 42 });
	});

	it("returns null for missing keys", async () => {
		const got = await kvGet<string>("test:does-not-exist");
		expect(got).toBeNull();
	});

	it("returns null when TTL has expired", async () => {
		const now = 1_000_000;
		vi.useFakeTimers();
		vi.setSystemTime(now);
		await kvSet("test:key", "value");

		vi.setSystemTime(now + 60_000);
		const fresh = await kvGet<string>("test:key", 120_000);
		expect(fresh).toBe("value");

		vi.setSystemTime(now + 200_000);
		const expired = await kvGet<string>("test:key", 120_000);
		expect(expired).toBeNull();
	});

	it("treats absent ttl as no expiration", async () => {
		const now = 1_000_000;
		vi.useFakeTimers();
		vi.setSystemTime(now);
		await kvSet("test:key", "value");

		vi.setSystemTime(now + 10_000_000_000);
		const got = await kvGet<string>("test:key");
		expect(got).toBe("value");
	});

	it("kvDel removes the value", async () => {
		await kvSet("test:key", "value");
		await kvDel("test:key");
		const got = await kvGet<string>("test:key");
		expect(got).toBeNull();
	});

	it("stores independent values per key", async () => {
		await kvSet("test:key", "a");
		await kvSet("test:other", "b");
		expect(await kvGet<string>("test:key")).toBe("a");
		expect(await kvGet<string>("test:other")).toBe("b");
	});

	it("kvMigrateWrapped moves a legacy {v,t} entry into IDB and clears it", async () => {
		const now = 1_000_000;
		vi.useFakeTimers();
		vi.setSystemTime(now);
		localStorage.setItem("test:key", JSON.stringify({ v: { a: 1 }, t: now }));

		const migrated = await kvMigrateWrapped<{ a: number }>("test:key", 120_000);
		expect(migrated).toEqual({ a: 1 });
		// localStorage cleared, value now lives in IDB.
		expect(localStorage.getItem("test:key")).toBeNull();
		expect(await kvGet<{ a: number }>("test:key")).toEqual({ a: 1 });
	});

	it("kvMigrateWrapped returns null (and still clears) for expired/malformed", async () => {
		const now = 1_000_000;
		vi.useFakeTimers();
		vi.setSystemTime(now);
		localStorage.setItem("test:key", JSON.stringify({ v: "x", t: now }));
		vi.setSystemTime(now + 200_000);
		expect(await kvMigrateWrapped<string>("test:key", 120_000)).toBeNull();
		expect(localStorage.getItem("test:key")).toBeNull();

		localStorage.setItem("test:other", "not json");
		expect(await kvMigrateWrapped<string>("test:other", 120_000)).toBeNull();
	});

	it("kvMigrateRaw moves a legacy raw string into IDB", async () => {
		localStorage.setItem("test:key", "true");
		const migrated = await kvMigrateRaw("test:key");
		expect(migrated).toBe("true");
		expect(localStorage.getItem("test:key")).toBeNull();
		expect(await kvGet<string>("test:key")).toBe("true");
	});

	it("kvGetOrMigrate prefers IDB, falls back to legacy localStorage", async () => {
		await kvSet("test:key", "from-idb");
		expect(await kvGetOrMigrate<string>("test:key", 120_000)).toBe("from-idb");

		localStorage.setItem(
			"test:other",
			JSON.stringify({ v: "from-ls", t: Date.now() }),
		);
		expect(await kvGetOrMigrate<string>("test:other", 120_000)).toBe("from-ls");
	});
});
