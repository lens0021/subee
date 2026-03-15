import type { entities } from "misskey-js";
import { lsGet, lsSet } from "./mastodon";

export type MisskeyReactions = Record<string, number>;

const EMOJI_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

async function fetchLocalEmojis(
	hostname: string,
): Promise<Record<string, string>> {
	const cacheKey = `subee:misskey:emojis:${hostname}`;
	const cached = lsGet<Record<string, string>>(cacheKey, EMOJI_CACHE_TTL);
	if (cached) return cached;

	try {
		const res = await fetch(`https://${hostname}/api/emojis`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		if (!res.ok) return {};
		const data = (await res.json()) as {
			emojis: { name: string; url: string }[];
		};
		const map = Object.fromEntries(data.emojis.map((e) => [e.name, e.url]));
		lsSet(cacheKey, map);
		return map;
	} catch {
		return {};
	}
}

async function isMisskey(hostname: string): Promise<boolean> {
	const cacheKey = `subee:misskey:is:${hostname}`;
	const raw = localStorage.getItem(cacheKey);
	if (raw !== null) return raw === "true";

	try {
		const res = await fetch(`https://${hostname}/api/meta`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		const result = res.ok;
		localStorage.setItem(cacheKey, String(result));
		return result;
	} catch {
		localStorage.setItem(cacheKey, "false");
		return false;
	}
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

		const res = await fetch(`https://${hostname}/api/notes/show`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ noteId }),
		});
		if (!res.ok) return null;

		const note = (await res.json()) as entities.Note;
		const reactions = (note.reactions ?? {}) as MisskeyReactions;
		const reactionEmojis = {
			...((note.reactionEmojis ?? {}) as Record<string, string>),
		};

		// reactionEmojis only contains remote emojis; local emojis (name@.)
		// must be looked up from the instance's emoji list.
		const hasLocalEmoji = Object.keys(reactions).some((r) => r.endsWith("@.:"));
		if (hasLocalEmoji) {
			const localEmojis = await fetchLocalEmojis(hostname);
			for (const reaction of Object.keys(reactions)) {
				const localMatch = reaction.match(/^:(.+)@\.:$/);
				if (localMatch) {
					const name = localMatch[1];
					if (localEmojis[name])
						reactionEmojis[`${name}@.`] = localEmojis[name];
				}
			}
		}

		if (Object.keys(reactions).length === 0) return null;

		return { reactions, reactionEmojis };
	} catch {
		return null;
	}
}
