import { beforeEach, describe, expect, it, vi } from "vitest";
import { kvDel, kvGet, kvSet } from "./kv";

describe("kv storage", () => {
	beforeEach(async () => {
		await kvDel("test:key");
		await kvDel("test:other");
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
});
