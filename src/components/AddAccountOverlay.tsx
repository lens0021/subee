import { useState } from "react";

interface AddAccountOverlayProps {
	onConfirm: (handle: string) => void;
	onCancel: () => void;
}

export function AddAccountOverlay({
	onConfirm,
	onCancel,
}: AddAccountOverlayProps) {
	const [handle, setHandle] = useState("");

	const submit = () => {
		const trimmed = handle.trim();
		if (trimmed) onConfirm(trimmed);
	};

	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
			<div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-4 shadow-xl">
				<h2 className="font-semibold mb-3">Add account</h2>
				<input
					type="text"
					value={handle}
					onChange={(e) => setHandle(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					className="w-full text-sm border rounded p-2 dark:bg-gray-700 dark:border-gray-600 font-mono"
					placeholder="@user@instance.social"
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
						onClick={submit}
						disabled={!handle.trim()}
						className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
					>
						Add
					</button>
				</div>
			</div>
		</div>
	);
}
