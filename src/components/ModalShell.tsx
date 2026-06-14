import type { ReactNode } from "react";

interface ModalShellProps {
	title: string;
	confirmLabel: string;
	confirmDisabled?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
	children: ReactNode;
}

// Shared bottom-sheet/centered modal: backdrop, panel, heading, and a
// Cancel / confirm footer. Callers supply the title, the confirm label, and the
// body (an input, textarea, etc.).
export function ModalShell({
	title,
	confirmLabel,
	confirmDisabled,
	onConfirm,
	onCancel,
	children,
}: ModalShellProps) {
	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
			<div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-4 shadow-xl">
				<h2 className="font-semibold mb-3">{title}</h2>
				{children}
				<div className="flex gap-2 mt-3 justify-end">
					<button
						type="button"
						onClick={onCancel}
						className="px-4 py-2 text-sm rounded border border-gray-300 dark:border-gray-600"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={confirmDisabled}
						className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
