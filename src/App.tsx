import {
	faFileImport,
	faShareFromSquare,
	faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { debounce } from "lodash";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useSubscriptions } from "./hooks/useSubscriptions";
import { LoginPage } from "./pages/LoginPage";
import { PublicPage } from "./pages/PublicPage";
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
	const [activeTab, setActiveTab] = useState<Tab>("subscribed");
	const activeTabRef = useRef<Tab>("subscribed");
	const [showImport, setShowImport] = useState(false);
	const [importText, setImportText] = useState("");
	const [copied, setCopied] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const publicScrollRef = useRef<HTMLDivElement>(null);
	const subscribedScrollRef = useRef<HTMLDivElement>(null);
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

	// Tab-aware history navigation
	useEffect(() => {
		history.scrollRestoration = "manual";
		window.history.replaceState({ tab: "subscribed" }, "");

		const onPopState = (e: PopStateEvent) => {
			const tab = (e.state as { tab?: Tab } | null)?.tab;
			if (tab === "public" || tab === "subscribed") {
				activeTabRef.current = tab;
				setActiveTab(tab);
			} else {
				// External history: scroll to top if scrolled, otherwise let exit
				const container =
					activeTabRef.current === "public"
						? publicScrollRef.current
						: subscribedScrollRef.current;
				if (container && container.scrollTop > 0) {
					container.scrollTo({ top: 0, behavior: "smooth" });
					window.history.pushState({ tab: activeTabRef.current }, "");
				}
				// else: allow the browser to leave the app
			}
		};

		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	// Save scroll positions for page-reload restore
	useEffect(() => {
		const publicEl = publicScrollRef.current;
		const subscribedEl = subscribedScrollRef.current;
		if (!publicEl || !subscribedEl) return;
		const savePublic = debounce(
			() => saveScroll("public", publicEl.scrollTop),
			300,
		);
		const saveSubscribed = debounce(
			() => saveScroll("subscribed", subscribedEl.scrollTop),
			300,
		);
		publicEl.addEventListener("scroll", savePublic, { passive: true });
		subscribedEl.addEventListener("scroll", saveSubscribed, { passive: true });
		return () => {
			publicEl.removeEventListener("scroll", savePublic);
			subscribedEl.removeEventListener("scroll", saveSubscribed);
			savePublic.cancel();
			saveSubscribed.cancel();
		};
	}, []);

	const switchTab = (tab: Tab) => {
		window.history.pushState({ tab }, "");
		setActiveTab(tab);
		const ref = tab === "public" ? publicScrollRef : subscribedScrollRef;
		requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));
	};

	const handleSubscribe = (handle: string) => {
		if (isSubscribed(handle)) {
			unsubscribe(handle);
		} else {
			subscribe(handle);
		}
	};

	const handleCopy = async () => {
		await navigator.clipboard.writeText(exportHandles(handles));
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setShowMenu(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

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
		<div className="h-dvh flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
			{/* Header */}
			<header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-40">
				<div className="max-w-2xl mx-auto">
					<div className="flex items-center">
						<h1 className="text-lg font-bold px-4 py-3 flex-shrink-0">subee</h1>
						<nav className="flex flex-1">
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
						</nav>
						<div className="flex items-center px-2 flex-shrink-0">
							{activeTab === "subscribed" && (
								<div ref={menuRef} className="relative">
									<button
										type="button"
										onClick={() => setShowMenu((v) => !v)}
										className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
									>
										⋯
									</button>
									{showMenu && (
										<div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 min-w-max">
											<button
												type="button"
												onClick={() => {
													handleCopy();
													setShowMenu(false);
												}}
												className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												<FontAwesomeIcon
													icon={faShareFromSquare}
													className={copied ? "text-green-500" : ""}
												/>
												{copied ? "Copied!" : "Export"}
											</button>
											<button
												type="button"
												onClick={() => {
													setShowImport(true);
													setShowMenu(false);
												}}
												className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
											>
												<FontAwesomeIcon icon={faFileImport} />
												Import
											</button>
										</div>
									)}
								</div>
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
			<main className="flex-1 overflow-hidden relative">
				<div
					ref={subscribedScrollRef}
					// biome-ignore lint/a11y/noNoninteractiveTabindex: scroll container needs keyboard focus
					tabIndex={0}
					className={`absolute inset-0 overflow-y-auto transition-none outline-none${activeTab !== "subscribed" ? " -translate-x-full" : ""}`}
					aria-hidden={activeTab !== "subscribed"}
				>
					<div className="max-w-2xl mx-auto">
						<SubscribedPage
							handles={handles}
							instanceUrl={auth.instanceUrl}
							accessToken={auth.accessToken}
							onSubscribe={handleSubscribe}
							isSubscribed={isSubscribed}
							initialScrollY={readScroll("subscribed")}
							scrollContainerRef={subscribedScrollRef}
						/>
					</div>
				</div>
				<div
					ref={publicScrollRef}
					// biome-ignore lint/a11y/noNoninteractiveTabindex: scroll container needs keyboard focus
					tabIndex={0}
					className={`absolute inset-0 overflow-y-auto transition-none outline-none${activeTab !== "public" ? " -translate-x-full" : ""}`}
					aria-hidden={activeTab !== "public"}
				>
					<div className="max-w-2xl mx-auto">
						<PublicPage
							instanceUrl={auth.instanceUrl}
							accessToken={auth.accessToken}
							onSubscribe={handleSubscribe}
							isSubscribed={isSubscribed}
							initialScrollY={readScroll("public")}
							scrollContainerRef={publicScrollRef}
						/>
					</div>
				</div>
			</main>
		</div>
	);
}
