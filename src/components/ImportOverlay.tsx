import { useState } from "react";
import { ModalShell } from "./ModalShell";

interface ImportOverlayProps {
	onConfirm: (text: string) => void;
	onCancel: () => void;
}

export function ImportOverlay({ onConfirm, onCancel }: ImportOverlayProps) {
	const [importText, setImportText] = useState("");

	return (
		<ModalShell
			title="Import subscriptions"
			confirmLabel="Import"
			confirmDisabled={!importText.trim()}
			onConfirm={() => onConfirm(importText)}
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
		</ModalShell>
	);
}
