import { faSignInAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { DEFAULT_INSTANCE } from "../mastodon";

interface LoginPageProps {
	onLogin: (instanceUrl: string) => void;
	error: string | null;
}

export function LoginPage({ onLogin, error }: LoginPageProps) {
	const [instance, setInstance] = useState(DEFAULT_INSTANCE);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		const url = instance.startsWith("http") ? instance : `https://${instance}`;
		await onLogin(url);
		setLoading(false);
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4">
			<div className="w-full max-w-sm">
				<h1 className="text-3xl font-bold text-center mb-2">subee</h1>
				<p className="text-center text-gray-500 text-sm mb-8">
					Browse the Fediverse and your subscribed accounts
				</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							htmlFor="instance"
							className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
						>
							Your Mastodon instance
						</label>
						<input
							id="instance"
							type="text"
							value={instance}
							onChange={(e) => setInstance(e.target.value)}
							placeholder="https://mastodon.social"
							className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
						/>
					</div>

					{error && (
						<div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
							{error}
						</div>
					)}

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
					>
						<FontAwesomeIcon icon={faSignInAlt} />
						{loading ? "Redirecting..." : "Log in with Mastodon"}
					</button>
				</form>

				<p className="text-xs text-center text-gray-400 mt-6">
					Read and write access is requested (for boosting and favouriting).
					Your credentials are never stored here.
				</p>
			</div>
		</div>
	);
}
