import { useState } from "react";
import { exportHandles, importHandles } from "../store/subscriptions";

interface ExportImportProps {
	handles: Set<string>;
	onImport: (handles: Set<string>) => void;
}

export function ExportImport({ handles, onImport }: ExportImportProps) {
	const [importing, setImporting] = useState(false);
	const [importText, setImportText] = useState("");
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(exportHandles(handles));
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handlePaste = async () => {
		const text = await navigator.clipboard.readText();
		setImportText(text);
		setImporting(true);
	};

	const handleImport = () => {
		onImport(importHandles(importText));
		setImporting(false);
		setImportText("");
	};

	return (
		<div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
			<div className="flex gap-2 flex-wrap">
				<button
					type="button"
					onClick={handleCopy}
					className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				>
					{copied ? "Copied!" : "Copy subscriptions"}
				</button>
				<button
					type="button"
					onClick={handlePaste}
					className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
				>
					Paste & import
				</button>
			</div>

			{importing && (
				<div className="mt-2">
					<textarea
						value={importText}
						onChange={(e) => setImportText(e.target.value)}
						className="w-full text-sm border rounded p-2 dark:bg-gray-800 dark:border-gray-600 font-mono"
						rows={4}
						placeholder="@user@instance.social (one per line)"
					/>
					<div className="flex gap-2 mt-1">
						<button
							type="button"
							onClick={handleImport}
							className="text-sm px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
						>
							Import
						</button>
						<button
							type="button"
							onClick={() => setImporting(false)}
							className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-600"
						>
							Cancel
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
