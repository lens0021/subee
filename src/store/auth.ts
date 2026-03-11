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
};

export function getAuth(): AuthState | null {
	const accessToken = localStorage.getItem(KEYS.accessToken);
	const instanceUrl = localStorage.getItem(KEYS.instanceUrl);
	if (!accessToken || !instanceUrl) return null;
	return { accessToken, instanceUrl };
}

export function saveAuth(state: AuthState): void {
	localStorage.setItem(KEYS.accessToken, state.accessToken);
	localStorage.setItem(KEYS.instanceUrl, state.instanceUrl);
}

export function clearAuth(): void {
	localStorage.removeItem(KEYS.accessToken);
	localStorage.removeItem(KEYS.instanceUrl);
}

export function getClientCredentials(
	instanceUrl: string,
): ClientCredentials | null {
	const clientId = localStorage.getItem(KEYS.clientId(instanceUrl));
	const clientSecret = localStorage.getItem(KEYS.clientSecret(instanceUrl));
	if (!clientId || !clientSecret) return null;
	return { clientId, clientSecret };
}

export function saveClientCredentials(
	instanceUrl: string,
	credentials: ClientCredentials,
): void {
	localStorage.setItem(KEYS.clientId(instanceUrl), credentials.clientId);
	localStorage.setItem(
		KEYS.clientSecret(instanceUrl),
		credentials.clientSecret,
	);
}
