import type { entities } from "misskey-js";

export type MisskeyReactions = Record<string, number>;

// Cache per hostname: true = is Misskey, false = not Misskey
const misskeyCache = new Map<string, boolean>();

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

export async function fetchMisskeyReactions(
	statusUrl: string,
): Promise<{
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
		const reactionEmojis = (note.reactionEmojis ?? {}) as Record<
			string,
			string
		>;

		if (Object.keys(reactions).length === 0) return null;

		return { reactions, reactionEmojis };
	} catch {
		return null;
	}
}
