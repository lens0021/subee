import type { entities } from "misskey-js";
import { kvGet, kvGetOrMigrate, kvMigrateRaw, kvSet } from "./storage/kv";

export type MisskeyReactions = Record<string, number>;

const EMOJI_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const fetchingEmoji = new Map<string, Promise<string | null>>();

async function fetchLocalEmoji(
	hostname: string,
	name: string,
): Promise<string | null> {
	const cacheKey = `subee:misskey:emoji:${hostname}:${name}`;
	const cached = await kvGetOrMigrate<string>(cacheKey, EMOJI_CACHE_TTL);
	if (cached) return cached;

	const inflightKey = `${hostname}:${name}`;
	const inflight = fetchingEmoji.get(inflightKey);
	if (inflight) return inflight;

	const promise = (async () => {
		try {
			const res = await fetch(`https://${hostname}/api/emoji`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
			});
			if (!res.ok) return null;
			const data = (await res.json()) as { url: string };
			await kvSet(cacheKey, data.url);
			return data.url;
		} catch {
			return null;
		} finally {
			fetchingEmoji.delete(inflightKey);
		}
	})();

	fetchingEmoji.set(inflightKey, promise);
	return promise;
}

const checkingMisskey = new Map<string, Promise<boolean>>();

async function isMisskey(hostname: string): Promise<boolean> {
	const cacheKey = `subee:misskey:is:${hostname}`;
	const cached = await kvGet<string>(cacheKey);
	if (cached !== null) return cached === "true";
	const migrated = await kvMigrateRaw(cacheKey);
	if (migrated !== null) return migrated === "true";

	const inflight = checkingMisskey.get(hostname);
	if (inflight) return inflight;

	const promise = (async () => {
		try {
			const res = await fetch(`https://${hostname}/api/meta`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			const result = res.ok;
			await kvSet(cacheKey, String(result));
			return result;
		} catch {
			await kvSet(cacheKey, "false");
			return false;
		} finally {
			checkingMisskey.delete(hostname);
		}
	})();

	checkingMisskey.set(hostname, promise);
	return promise;
}

export async function fetchMisskeyReactions(statusUrl: string): Promise<{
	reactions: MisskeyReactions;
	reactionEmojis: Record<string, string>;
} | null> {
	try {
		const url = new URL(statusUrl);
		const match = url.pathname.match(/^\/notes\/([a-zA-Z0-9]+)$/);
		if (!match) return null;

		const noteId = match[1];
		const hostname = url.hostname;

		if (!(await isMisskey(hostname))) return null;

		const restrictedKey = `subee:misskey:restricted:${hostname}`;
		const restricted = await kvGetOrMigrate<boolean>(
			restrictedKey,
			EMOJI_CACHE_TTL,
		);
		if (restricted) return null;

		let res: Response;
		try {
			res = await fetch(`https://${hostname}/api/notes/show`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ noteId }),
			});
		} catch {
			// Network error or browser-blocked request — skip this instance for 7 days
			await kvSet(restrictedKey, true);
			return null;
		}
		if (!res.ok) {
			if (res.status === 400) {
				try {
					const err = await res.json();
					const errCode = err?.error?.code ?? err?.code;
					if (errCode) {
						// Valid Misskey error (e.g. CONTENT_RESTRICTED_BY_USER) — skip this instance for 7 days
						await kvSet(restrictedKey, true);
					} else {
						// Not a Misskey-format error — false-positive isMisskey, mark permanently
						await kvSet(`subee:misskey:is:${hostname}`, "false");
					}
				} catch {
					await kvSet(`subee:misskey:is:${hostname}`, "false");
				}
			}
			return null;
		}

		const note = (await res.json()) as entities.Note;
		const reactions = (note.reactions ?? {}) as MisskeyReactions;
		const reactionEmojis = {
			...((note.reactionEmojis ?? {}) as Record<string, string>),
		};

		// reactionEmojis only contains remote emojis; local emojis (name@.)
		// must be looked up individually from the instance.
		const localEmojiNames = Object.keys(reactions)
			.map((r) => r.match(/^:(.+)@\.:$/)?.[1])
			.filter((n): n is string => !!n);
		if (localEmojiNames.length > 0) {
			const urls = await Promise.all(
				localEmojiNames.map((name) => fetchLocalEmoji(hostname, name)),
			);
			for (let i = 0; i < localEmojiNames.length; i++) {
				const url = urls[i];
				if (url) reactionEmojis[`${localEmojiNames[i]}@.`] = url;
			}
		}

		if (Object.keys(reactions).length === 0) return null;

		return { reactions, reactionEmojis };
	} catch {
		return null;
	}
}
