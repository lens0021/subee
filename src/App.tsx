import { faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import { FloatingRefreshButton } from "./components/FloatingRefreshButton";
import { useAuth } from "./hooks/useAuth";
import { useSubscriptions } from "./hooks/useSubscriptions";
import { PublicPage } from "./pages/PublicPage";
import { LoginPage } from "./pages/LoginPage";
import { SubscribedPage } from "./pages/SubscribedPage";
import { saveSubscriptions } from "./store/subscriptions";

type Tab = "public" | "subscribed";

export default function App() {
	const { auth, status, error: authError, login, logout } = useAuth();
	const [activeTab, setActiveTab] = useState<Tab>("public");
	const scrollPos = useRef<Record<Tab, number>>({ public: 0, subscribed: 0 });

	const switchTab = (tab: Tab) => {
		scrollPos.current[activeTab] = window.scrollY;
		setActiveTab(tab);
	};

	useEffect(() => {
		window.scrollTo(0, scrollPos.current[activeTab]);
	}, [activeTab]);
	const {
		handles,
		loading: subsLoading,
		subscribe,
		unsubscribe,
		isSubscribed,
	} = useSubscriptions();

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
						<div className="flex items-center gap-1 px-2 flex-shrink-0">
							<span className="text-xs text-gray-400">{instanceHostname}</span>
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

			{/* Content */}
			<main className="max-w-2xl mx-auto">
				<div className={activeTab !== "public" ? "hidden" : ""}>
					<PublicPage
						instanceUrl={auth.instanceUrl}
						accessToken={auth.accessToken}
						onSubscribe={handleSubscribe}
						isSubscribed={isSubscribed}
					/>
				</div>
				<div className={activeTab !== "subscribed" ? "hidden" : ""}>
					<SubscribedPage
						handles={handles}
						accessToken={auth.accessToken}
						onHandlesChange={handleHandlesChange}
						onSubscribe={handleSubscribe}
						isSubscribed={isSubscribed}
					/>
				</div>
			</main>
		</div>
	);
}
