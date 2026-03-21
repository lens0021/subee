import type { AccountLoadStatus } from "../hooks/useSubscribedFeed";

const DOT_COLOR: Record<AccountLoadStatus, string> = {
	idle: "bg-gray-300 dark:bg-gray-600",
	resolving: "bg-yellow-400 animate-pulse",
	loading: "bg-blue-400 animate-pulse",
	done: "bg-green-400",
	failed: "bg-red-500",
};

export function AccountStatusGrid({
	statuses,
}: {
	statuses: Map<string, AccountLoadStatus>;
}) {
	const entries = [...statuses.entries()];
	let done = 0;
	let inProgress = 0;
	let failed = 0;
	for (const [, s] of entries) {
		if (s === "done") done++;
		else if (s === "failed") failed++;
		else inProgress++;
	}

	return (
		<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
			<div className="flex flex-wrap gap-1 mb-2">
				{entries.map(([handle, status]) => (
					<span
						key={handle}
						className={`w-3 h-3 rounded-full inline-block ${DOT_COLOR[status]}`}
						title={handle}
					/>
				))}
			</div>
			<div className="flex gap-3 text-xs text-gray-400">
				{done > 0 && (
					<span>
						<span className="text-green-500">●</span> 완료 {done}
					</span>
				)}
				{inProgress > 0 && (
					<span>
						<span className="text-blue-400">●</span> 진행 중 {inProgress}
					</span>
				)}
				{failed > 0 && (
					<span>
						<span className="text-red-500">●</span> 실패 {failed}
					</span>
				)}
			</div>
		</div>
	);
}
