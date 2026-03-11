import {
	faFileImport,
	faSignOutAlt,
	faShareFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { debounce } from "lodash";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useSubscriptions } from "./hooks/useSubscriptions";
import { PublicPage } from "./pages/PublicPage";
import { LoginPage } from "./pages/LoginPage";
import { SubscribedPage } from "./pages/SubscribedPage";
import {
	exportHandles,
	importHandles,
	saveSubscriptions,
} from "./store/subscriptions";

type Tab = "public" | "subscribed";

const SCROLL_KEYS: Record<Tab, string> = {
	public: "subee:scroll:public",
	subscribed: "subee:scroll:subscribed",
};

function readScroll(tab: Tab): number {
	return Number(sessionStorage.getItem(SCROLL_KEYS[tab]) ?? 0);
}

function saveScroll(tab: Tab, y: number) {
	sessionStorage.setItem(SCROLL_KEYS[tab], String(y));
}

export default function App() {
	const { auth, status, error: authError, login, logout } = useAuth();
	const [activeTab, setActiveTab] = useState<Tab>("public");
	const activeTabRef = useRef<Tab>("public");
	const [showImport, setShowImport] = useState(false);
	const [importText, setImportText] = useState("");
	const [copied, setCopied] = useState(false);
	const {
		handles,
		loading: subsLoading,
		subscribe,
		unsubscribe,
		isSubscribed,
	} = useSubscriptions();

	// Keep a ref so the popstate closure always sees the current tab
	useEffect(() => {
		activeTabRef.current = activeTab;
	}, [activeTab]);

	// Tab-aware history navigation:
	// - replaceState on mount so there's a named entry to return to
	// - pushState on each switchTab so back navigates between tabs
	// - popstate: if state has a known tab, switch to it;
	//   if not (external history), scroll to top or let the app exit
	useEffect(() => {
		history.scrollRestoration = "manual";
		window.history.replaceState({ tab: "public" }, "");

		const onPopState = (e: PopStateEvent) => {
			const tab = (e.state as { tab?: Tab } | null)?.tab;
			if (tab === "public" || tab === "subscribed") {
				saveScroll(activeTabRef.current, window.scrollY);
				activeTabRef.current = tab;
				setActiveTab(tab);
			} else {
				// External history: scroll to top if scrolled, otherwise let exit
				if (window.scrollY > 0) {
					window.scrollTo({ top: 0, behavior: "smooth" });
					window.history.pushState({ tab: activeTabRef.current }, "");
				}
				// else: allow the browser to leave the app
			}
		};

		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	const switchTab = (tab: Tab) => {
		saveScroll(activeTab, window.scrollY);
		window.history.pushState({ tab }, "");
		setActiveTab(tab);
	};

	// Restore saved scroll after tab switch
	useEffect(() => {
		window.scrollTo(0, readScroll(activeTab));
	}, [activeTab]);

	// Periodically save scroll position for the active tab
	useEffect(() => {
		const save = debounce(() => saveScroll(activeTab, window.scrollY), 300);
		window.addEventListener("scroll", save, { passive: true });
		return () => {
			window.removeEventListener("scroll", save);
			save.cancel();
		};
	}, [activeTab]);

	const handleSubscribe = (handle: string) => {
		if (isSubscribed(handle)) {
			unsubscribe(handle);
		} else {
			subscribe(handle);
		}
	};

	const handleHandlesChange = async (newHandles: Set<string>) => {
		await saveSubscriptions(newHandles);
		window.location.reload();
	};

	const handleCopy = async () => {
		await navigator.clipboard.writeText(exportHandles(handles));
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleImportConfirm = async () => {
		const newHandles = importHandles(importText);
		await saveSubscriptions(newHandles);
		setShowImport(false);
		setImportText("");
		window.location.reload();
	};

	if (status === "loading") {
		return (
			<div className="min-h-screen flex items-center justify-center text-gray-400">
				Loading...
			</div>
		);
	}

	if (status === "unauthenticated") {
		return <LoginPage onLogin={login} error={authError} />;
	}

	if (subsLoading || !auth) {
		return (
			<div className="min-h-screen flex items-center justify-center text-gray-400">
				Loading...
			</div>
		);
	}

	const instanceHostname = new URL(auth.instanceUrl).hostname;

	return (
		<div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
			{/* Header */}
			<header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-40">
				<div className="max-w-2xl mx-auto">
					<div className="flex items-center">
						<h1 className="text-lg font-bold px-4 py-3 flex-shrink-0">subee</h1>
						<nav className="flex flex-1">
							<button
								type="button"
								onClick={() => switchTab("public")}
								className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "public"
										? "border-blue-500 text-blue-500"
										: "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
								}`}
							>
								Home
							</button>
							<button
								type="button"
								onClick={() => switchTab("subscribed")}
								className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
									activeTab === "subscribed"
										? "border-blue-500 text-blue-500"
										: "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
								}`}
							>
								Subscribed
								{handles.size > 0 && (
									<span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full px-1.5">
										{handles.size}
									</span>
								)}
							</button>
						</nav>
						<div className="flex items-center px-2 flex-shrink-0">
							{activeTab === "subscribed" && (
								<>
									<button
										type="button"
										onClick={handleCopy}
										title="Copy subscriptions"
										className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
									>
										<FontAwesomeIcon
											icon={faShareFromSquare}
											className={copied ? "text-green-500" : ""}
										/>
									</button>
									<button
										type="button"
										onClick={() => setShowImport(true)}
										title="Import subscriptions"
										className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
									>
										<FontAwesomeIcon icon={faFileImport} />
									</button>
								</>
							)}
							<span className="text-xs text-gray-400 px-1">
								{instanceHostname}
							</span>
							<button
								type="button"
								onClick={logout}
								title="Log out"
								className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							>
								<FontAwesomeIcon icon={faSignOutAlt} />
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Import overlay */}
			{showImport && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
					<div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-4 shadow-xl">
						<h2 className="font-semibold mb-3">Import subscriptions</h2>
						<textarea
							value={importText}
							onChange={(e) => setImportText(e.target.value)}
							className="w-full text-sm border rounded p-2 dark:bg-gray-700 dark:border-gray-600 font-mono"
							rows={6}
							placeholder="@user@instance.social (one per line)"
							// biome-ignore lint/a11y/noAutofocus: intentional focus for overlay
							autoFocus
						/>
						<div className="flex gap-2 mt-3 justify-end">
							<button
								type="button"
								onClick={() => {
									setShowImport(false);
									setImportText("");
								}}
								className="px-4 py-2 text-sm rounded border border-gray-300 dark:border-gray-600"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleImportConfirm}
								className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
							>
								Import
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Content */}
			<main className="max-w-2xl mx-auto">
				<div className={activeTab !== "public" ? "hidden" : ""}>
					<PublicPage
						instanceUrl={auth.instanceUrl}
						accessToken={auth.accessToken}
						onSubscribe={handleSubscribe}
						isSubscribed={isSubscribed}
						initialScrollY={readScroll("public")}
					/>
				</div>
				<div className={activeTab !== "subscribed" ? "hidden" : ""}>
					<SubscribedPage
						handles={handles}
						instanceUrl={auth.instanceUrl}
						accessToken={auth.accessToken}
						onSubscribe={handleSubscribe}
						isSubscribed={isSubscribed}
						initialScrollY={readScroll("subscribed")}
					/>
				</div>
			</main>
		</div>
	);
}
