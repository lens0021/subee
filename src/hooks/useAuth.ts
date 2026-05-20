import { useCallback, useEffect, useState } from "react";
import {
	buildAuthorizationUrl,
	exchangeCodeForToken,
	OAUTH_SCOPE_VERSION,
	registerApp,
} from "../mastodon";
import {
	type AuthState,
	clearAuth,
	getClientCredentials,
	loadAuth,
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
		let cancelled = false;
		(async () => {
			const params = new URLSearchParams(window.location.search);
			const code = params.get("code");

			if (code) {
				// Remove code from URL without reload
				const cleanUrl = window.location.pathname;
				window.history.replaceState({}, "", cleanUrl);

				const pendingInstance = sessionStorage.getItem("subee:pendingInstance");
				if (!pendingInstance) {
					if (cancelled) return;
					setError("OAuth callback received but instance URL is missing.");
					setStatus("unauthenticated");
					return;
				}
				sessionStorage.removeItem("subee:pendingInstance");

				const creds = await getClientCredentials(
					pendingInstance,
					OAUTH_SCOPE_VERSION,
				);
				if (!creds) {
					if (cancelled) return;
					setError(
						"OAuth callback received but client credentials are missing.",
					);
					setStatus("unauthenticated");
					return;
				}

				try {
					const accessToken = await exchangeCodeForToken(
						pendingInstance,
						code,
						creds.clientId,
						creds.clientSecret,
					);
					const state: AuthState = {
						accessToken,
						instanceUrl: pendingInstance,
					};
					await saveAuth(state);
					if (cancelled) return;
					setAuth(state);
					setStatus("authenticated");
				} catch (e) {
					if (cancelled) return;
					setError(String(e));
					setStatus("unauthenticated");
				}
				return;
			}

			const existing = await loadAuth();
			if (cancelled) return;
			if (existing) {
				setAuth(existing);
				setStatus("authenticated");
			} else {
				setStatus("unauthenticated");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const login = useCallback(async (instanceUrl: string) => {
		setError(null);
		try {
			let creds = await getClientCredentials(instanceUrl, OAUTH_SCOPE_VERSION);
			if (!creds) {
				creds = await registerApp(instanceUrl);
				await saveClientCredentials(instanceUrl, creds, OAUTH_SCOPE_VERSION);
			}
			sessionStorage.setItem("subee:pendingInstance", instanceUrl);
			window.location.href = buildAuthorizationUrl(instanceUrl, creds.clientId);
		} catch (e) {
			setError(String(e));
		}
	}, []);

	const logout = useCallback(async () => {
		await clearAuth();
		setAuth(null);
		setStatus("unauthenticated");
	}, []);

	return { auth, status, error, login, logout };
}
