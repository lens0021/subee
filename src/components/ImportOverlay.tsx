import { useState } from "react";
import { ModalShell } from "./ModalShell";

export type ImportMode = "merge" | "replace";

interface ImportOverlayProps {
	currentCount: number;
	onConfirm: (text: string, mode: ImportMode) => void;
	onCancel: () => void;
}

export function ImportOverlay({
	currentCount,
	onConfirm,
	onCancel,
}: ImportOverlayProps) {
	const [importText, setImportText] = useState("");
	// Default to the non-destructive option: most "import what a friend shared"
	// flows mean "add these", not "wipe mine and use only these".
	const [mode, setMode] = useState<ImportMode>("merge");

	const plural = currentCount === 1 ? "" : "s";

	return (
		<ModalShell
			title="Import subscriptions"
			confirmLabel="Import"
			confirmDisabled={!importText.trim()}
			onConfirm={() => onConfirm(importText, mode)}
			onCancel={onCancel}
		>
			<textarea
				value={importText}
				onChange={(e) => setImportText(e.target.value)}
				className="w-full text-sm border rounded p-2 dark:bg-gray-700 dark:border-gray-600 font-mono"
				rows={6}
				placeholder="@user@instance.social (one per line)"
				// biome-ignore lint/a11y/noAutofocus: intentional focus for overlay
				autoFocus
			/>
			{currentCount > 0 && (
				<fieldset className="mt-3 flex flex-col gap-1.5 text-sm">
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="import-mode"
							checked={mode === "merge"}
							onChange={() => setMode("merge")}
						/>
						<span>
							Merge — add to your {currentCount} current subscription{plural}
						</span>
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="import-mode"
							checked={mode === "replace"}
							onChange={() => setMode("replace")}
						/>
						<span>Replace — overwrite all {currentCount}</span>
					</label>
					{mode === "replace" && (
						<p className="text-xs text-red-500">
							Removes your {currentCount} current subscription{plural}.
						</p>
					)}
				</fieldset>
			)}
		</ModalShell>
	);
}
