import type { entities } from "misskey-js";

export type MisskeyReactions = Record<string, number>;

// Cache per hostname: true = is Misskey, false = not Misskey
const misskeyCache = new Map<string, boolean>();

// Cache per hostname: local emoji name → URL
const localEmojiCache = new Map<string, Record<string, string>>();

async function fetchLocalEmojis(
	hostname: string,
): Promise<Record<string, string>> {
	const cached = localEmojiCache.get(hostname);
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
		localEmojiCache.set(hostname, map);
		return map;
	} catch {
		return {};
	}
}

async function isMisskey(hostname: string): Promise<boolean> {
	const cached = misskeyCache.get(hostname);
	if (cached !== undefined) return cached;

	try {
		const res = await fetch(`https://${hostname}/api/meta`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		const result = res.ok;
		misskeyCache.set(hostname, result);
		return result;
	} catch {
		misskeyCache.set(hostname, false);
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
