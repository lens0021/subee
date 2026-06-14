import { kvGetOrMigrate, kvSet } from "./kv";

export interface AccountCursor {
	accountId: string;
	instanceUrl: string;
	handle: string;
	maxId?: string;
	sinceId?: string;
	done: boolean;
	lastPolledAt?: number;
}

export const CURSOR_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const cursorKey = (instanceUrl: string) => `subee:cursors:${instanceUrl}`;

export async function loadCursorCache(
	instanceUrl: string,
): Promise<[string, AccountCursor][] | null> {
	return kvGetOrMigrate<[string, AccountCursor][]>(
		cursorKey(instanceUrl),
		CURSOR_CACHE_TTL,
	);
}

export async function saveCursorCache(
	instanceUrl: string,
	entries: [string, AccountCursor][],
): Promise<void> {
	await kvSet(cursorKey(instanceUrl), entries);
}
