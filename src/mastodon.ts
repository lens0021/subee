import type { mastodon } from "masto";

export const DEFAULT_INSTANCE = "https://mastodon.social";

function instanceBase(url: string): string {
	return url.replace(/\/$/, "");
}

function camelize(obj: unknown): unknown {
	if (Array.isArray(obj)) return obj.map(camelize);
	if (obj !== null && typeof obj === "object") {
		return Object.fromEntries(
			Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
				k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
				camelize(v),
			]),
		);
	}
	return obj;
}

async function apiFetch<T>(url: string, accessToken?: string): Promise<T> {
	const headers: HeadersInit = accessToken
		? { Authorization: `Bearer ${accessToken}` }
		: {};
	const res = await fetch(url, { headers });
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
	return camelize(await res.json()) as T;
}

async function apiPost<T>(url: string, accessToken: string): Promise<T> {
	const res = await fetch(url, {
		method: "POST",
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
	return camelize(await res.json()) as T;
}

// Parse "@user@instance.social" or "user@instance.social" into parts
export function parseHandle(handle: string): {
	username: string;
	instanceUrl: string;
} {
	const clean = handle.replace(/^@/, "");
	const parts = clean.split("@");
	if (parts.length === 2) {
		return { username: parts[0], instanceUrl: `https://${parts[1]}` };
	}
	return { username: parts[0], instanceUrl: DEFAULT_INSTANCE };
}

// --- OAuth ---

export function getRedirectUri(): string {
	return `${window.location.origin}${window.location.pathname}`;
}

interface AppRegistration {
	clientId: string;
	clientSecret: string;
}

export const OAUTH_SCOPES = [
	"read",
	"write:bookmarks",
	"write:favourites",
	"write:follows",
	"write:media",
	"write:mutes",
	"write:statuses",
].join(" ");

// Bump this string whenever OAUTH_SCOPES changes to force re-registration.
export const OAUTH_SCOPE_VERSION = "v2";

export async function registerApp(
	instanceUrl: string,
): Promise<AppRegistration> {
	const res = await fetch(`${instanceBase(instanceUrl)}/api/v1/apps`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			client_name: "subee",
			redirect_uris: getRedirectUri(),
			scopes: OAUTH_SCOPES,
			website: getRedirectUri(),
		}),
	});
	if (!res.ok) throw new Error(`Failed to register app: ${await res.text()}`);
	const data = await res.json();
	return { clientId: data.client_id, clientSecret: data.client_secret };
}

export function buildAuthorizationUrl(
	instanceUrl: string,
	clientId: string,
): string {
	const url = new URL(`${instanceBase(instanceUrl)}/oauth/authorize`);
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", getRedirectUri());
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", OAUTH_SCOPES);
	return url.toString();
}

export async function exchangeCodeForToken(
	instanceUrl: string,
	code: string,
	clientId: string,
	clientSecret: string,
): Promise<string> {
	const res = await fetch(`${instanceBase(instanceUrl)}/oauth/token`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: getRedirectUri(),
			grant_type: "authorization_code",
			code,
			scope: OAUTH_SCOPES,
		}),
	});
	if (!res.ok) throw new Error(`Failed to exchange token: ${await res.text()}`);
	const data = await res.json();
	return data.access_token;
}

// --- Caches ---

const ACCOUNT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const STATUS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedAccount {
	id: string;
	cachedAt: number;
}

const accountCache = new Map<string, CachedAccount>();

interface CachedStatuses {
	statuses: mastodon.v1.Status[];
	cachedAt: number;
}

const statusCache = new Map<string, CachedStatuses>();

// localStatusId cache: post URL → local status ID on the user's instance
const localStatusIdCache = new Map<string, string>();

// --- Timeline / Account API ---

export async function fetchHomeTimeline(
	instanceUrl: string,
	params?: { maxId?: string; limit?: number },
	accessToken?: string,
): Promise<mastodon.v1.Status[]> {
	const url = new URL(`${instanceBase(instanceUrl)}/api/v1/timelines/home`);
	if (params?.maxId) url.searchParams.set("max_id", params.maxId);
	url.searchParams.set("limit", String(params?.limit ?? 20));
	return apiFetch<mastodon.v1.Status[]>(url.toString(), accessToken);
}

export async function lookupAccount(
	instanceUrl: string,
	username: string,
	accessToken?: string,
): Promise<mastodon.v1.Account> {
	const cacheKey = `${instanceUrl}:${username}`;
	const cached = accountCache.get(cacheKey);
	if (cached && Date.now() - cached.cachedAt < ACCOUNT_CACHE_TTL) {
		return { id: cached.id } as mastodon.v1.Account;
	}
	const url = `${instanceBase(instanceUrl)}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`;
	const account = await apiFetch<mastodon.v1.Account>(url, accessToken);
	accountCache.set(cacheKey, { id: account.id, cachedAt: Date.now() });
	return account;
}

export async function fetchAccountStatuses(
	instanceUrl: string,
	accountId: string,
	params?: { maxId?: string; limit?: number },
	accessToken?: string,
): Promise<mastodon.v1.Status[]> {
	const cacheKey = `${instanceUrl}:${accountId}:${params?.maxId ?? ""}`;
	const cached = statusCache.get(cacheKey);
	if (cached && Date.now() - cached.cachedAt < STATUS_CACHE_TTL) {
		return cached.statuses;
	}
	const url = new URL(
		`${instanceBase(instanceUrl)}/api/v1/accounts/${accountId}/statuses`,
	);
	if (params?.maxId) url.searchParams.set("max_id", params.maxId);
	url.searchParams.set("limit", String(params?.limit ?? 20));
	const statuses = await apiFetch<mastodon.v1.Status[]>(
		url.toString(),
		accessToken,
	);
	statusCache.set(cacheKey, { statuses, cachedAt: Date.now() });
	return statuses;
}

// --- Interactions ---

// Resolve a post URL to a status ID on the user's own instance.
// Uses /api/v1/search with resolve=true so cross-instance posts are fetched.
async function resolveStatus(
	instanceUrl: string,
	postUrl: string,
	accessToken: string,
): Promise<string> {
	const cached = localStatusIdCache.get(postUrl);
	if (cached) return cached;
	const url = new URL(`${instanceBase(instanceUrl)}/api/v1/search`);
	url.searchParams.set("q", postUrl);
	url.searchParams.set("resolve", "true");
	url.searchParams.set("type", "statuses");
	url.searchParams.set("limit", "1");
	const result = await apiFetch<{ statuses: mastodon.v1.Status[] }>(
		url.toString(),
		accessToken,
	);
	const id = result.statuses[0]?.id;
	if (!id) throw new Error("Post not found on your instance");
	localStatusIdCache.set(postUrl, id);
	return id;
}

export async function reblogStatus(
	instanceUrl: string,
	postUrl: string,
	accessToken: string,
): Promise<void> {
	const id = await resolveStatus(instanceUrl, postUrl, accessToken);
	await apiPost(
		`${instanceBase(instanceUrl)}/api/v1/statuses/${id}/reblog`,
		accessToken,
	);
}

export async function unreblogStatus(
	instanceUrl: string,
	postUrl: string,
	accessToken: string,
): Promise<void> {
	const id = await resolveStatus(instanceUrl, postUrl, accessToken);
	await apiPost(
		`${instanceBase(instanceUrl)}/api/v1/statuses/${id}/unreblog`,
		accessToken,
	);
}

export async function favouriteStatus(
	instanceUrl: string,
	postUrl: string,
	accessToken: string,
): Promise<void> {
	const id = await resolveStatus(instanceUrl, postUrl, accessToken);
	await apiPost(
		`${instanceBase(instanceUrl)}/api/v1/statuses/${id}/favourite`,
		accessToken,
	);
}

export async function unfavouriteStatus(
	instanceUrl: string,
	postUrl: string,
	accessToken: string,
): Promise<void> {
	const id = await resolveStatus(instanceUrl, postUrl, accessToken);
	await apiPost(
		`${instanceBase(instanceUrl)}/api/v1/statuses/${id}/unfavourite`,
		accessToken,
	);
}
