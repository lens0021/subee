import { kvDel, kvGet, kvSet } from "../storage/kv";

export interface AuthState {
	accessToken: string;
	instanceUrl: string;
}

interface ClientCredentials {
	clientId: string;
	clientSecret: string;
}

const KEYS = {
	accessToken: "subee:accessToken",
	instanceUrl: "subee:instanceUrl",
	clientId: (instance: string) => `subee:clientId:${instance}`,
	clientSecret: (instance: string) => `subee:clientSecret:${instance}`,
	scopeVersion: (instance: string) => `subee:scopeVersion:${instance}`,
};

let migration: Promise<void> | null = null;
function migrateFromLocalStorage(): Promise<void> {
	if (migration) return migration;
	migration = (async () => {
		if (typeof localStorage === "undefined") return;
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (!k) continue;
			if (
				k === KEYS.accessToken ||
				k === KEYS.instanceUrl ||
				k.startsWith("subee:clientId:") ||
				k.startsWith("subee:clientSecret:") ||
				k.startsWith("subee:scopeVersion:")
			) {
				keys.push(k);
			}
		}
		for (const k of keys) {
			const v = localStorage.getItem(k);
			// Remove the localStorage copy only after IDB confirms the write — an
			// IDB failure here would otherwise wipe the access token from both
			// stores and silently log the user out.
			if (v !== null && (await kvSet(k, v))) {
				localStorage.removeItem(k);
			}
		}
	})();
	return migration;
}

export async function loadAuth(): Promise<AuthState | null> {
	await migrateFromLocalStorage();
	const accessToken = await kvGet<string>(KEYS.accessToken);
	const instanceUrl = await kvGet<string>(KEYS.instanceUrl);
	if (!accessToken || !instanceUrl) return null;
	return { accessToken, instanceUrl };
}

export async function saveAuth(state: AuthState): Promise<void> {
	await kvSet(KEYS.accessToken, state.accessToken);
	await kvSet(KEYS.instanceUrl, state.instanceUrl);
}

export async function clearAuth(): Promise<void> {
	await kvDel(KEYS.accessToken);
	await kvDel(KEYS.instanceUrl);
}

export async function getClientCredentials(
	instanceUrl: string,
	scopeVersion: string,
): Promise<ClientCredentials | null> {
	await migrateFromLocalStorage();
	const storedVersion = await kvGet<string>(KEYS.scopeVersion(instanceUrl));
	if (storedVersion !== scopeVersion) {
		return null;
	}
	const clientId = await kvGet<string>(KEYS.clientId(instanceUrl));
	const clientSecret = await kvGet<string>(KEYS.clientSecret(instanceUrl));
	if (!clientId || !clientSecret) return null;
	return { clientId, clientSecret };
}

export async function saveClientCredentials(
	instanceUrl: string,
	credentials: ClientCredentials,
	scopeVersion: string,
): Promise<void> {
	await kvSet(KEYS.clientId(instanceUrl), credentials.clientId);
	await kvSet(KEYS.clientSecret(instanceUrl), credentials.clientSecret);
	await kvSet(KEYS.scopeVersion(instanceUrl), scopeVersion);
}
