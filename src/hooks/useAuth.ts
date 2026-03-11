import { useCallback, useEffect, useState } from "react";
import {
	OAUTH_SCOPE_VERSION,
	buildAuthorizationUrl,
	exchangeCodeForToken,
	registerApp,
} from "../mastodon";
import {
	type AuthState,
	clearAuth,
	getAuth,
	getClientCredentials,
	saveAuth,
	saveClientCredentials,
} from "../store/auth";

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

export function useAuth() {
	const [auth, setAuth] = useState<AuthState | null>(null);
	const [status, setStatus] = useState<AuthStatus>("loading");
	const [error, setError] = useState<string | null>(null);

	// On mount: check for OAuth callback code or existing token
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");

		if (code) {
			// Remove code from URL without reload
			const cleanUrl = window.location.pathname;
			window.history.replaceState({}, "", cleanUrl);

			// We need the instance URL stored before redirect
			const pendingInstance = sessionStorage.getItem("subee:pendingInstance");
			if (!pendingInstance) {
				setError("OAuth callback received but instance URL is missing.");
				setStatus("unauthenticated");
				return;
			}
			sessionStorage.removeItem("subee:pendingInstance");

			const creds = getClientCredentials(pendingInstance, OAUTH_SCOPE_VERSION);
			if (!creds) {
				setError("OAuth callback received but client credentials are missing.");
				setStatus("unauthenticated");
				return;
			}

			exchangeCodeForToken(
				pendingInstance,
				code,
				creds.clientId,
				creds.clientSecret,
			)
				.then((accessToken) => {
					const state: AuthState = {
						accessToken,
						instanceUrl: pendingInstance,
					};
					saveAuth(state);
					setAuth(state);
					setStatus("authenticated");
				})
				.catch((e) => {
					setError(String(e));
					setStatus("unauthenticated");
				});
			return;
		}

		// Check existing token
		const existing = getAuth();
		if (existing) {
			setAuth(existing);
			setStatus("authenticated");
		} else {
			setStatus("unauthenticated");
		}
	}, []);

	const login = useCallback(async (instanceUrl: string) => {
		setError(null);
		try {
			let creds = getClientCredentials(instanceUrl, OAUTH_SCOPE_VERSION);
			if (!creds) {
				creds = await registerApp(instanceUrl);
				saveClientCredentials(instanceUrl, creds, OAUTH_SCOPE_VERSION);
			}
			sessionStorage.setItem("subee:pendingInstance", instanceUrl);
			window.location.href = buildAuthorizationUrl(instanceUrl, creds.clientId);
		} catch (e) {
			setError(String(e));
		}
	}, []);

	const logout = useCallback(() => {
		clearAuth();
		setAuth(null);
		setStatus("unauthenticated");
	}, []);

	return { auth, status, error, login, logout };
}
