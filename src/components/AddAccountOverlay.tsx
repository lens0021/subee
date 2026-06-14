import { useState } from "react";
import { ModalShell } from "./ModalShell";

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
		<ModalShell
			title="Add account"
			confirmLabel="Add"
			confirmDisabled={!handle.trim()}
			onConfirm={submit}
			onCancel={onCancel}
		>
			<input
				type="text"
				value={handle}
				onChange={(e) => setHandle(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && submit()}
				className="w-full text-sm border rounded p-2 dark:bg-gray-700 dark:border-gray-600 font-mono"
				placeholder="@user@instance.social or profile URL"
				// biome-ignore lint/a11y/noAutofocus: intentional focus for overlay
				autoFocus
			/>
		</ModalShell>
	);
}
