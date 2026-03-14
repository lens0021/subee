import { useState } from "react";

interface ImportOverlayProps {
	onConfirm: (text: string) => void;
	onCancel: () => void;
}

export function ImportOverlay({ onConfirm, onCancel }: ImportOverlayProps) {
	const [importText, setImportText] = useState("");

	return (
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
						onClick={onCancel}
						className="px-4 py-2 text-sm rounded border border-gray-300 dark:border-gray-600"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => onConfirm(importText)}
						className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
					>
						Import
					</button>
				</div>
			</div>
		</div>
	);
}
