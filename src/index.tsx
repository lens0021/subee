import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Ask the browser/WebView to keep our IndexedDB cache (cursors + posts)
// non-evictable, so reopening shows the cached feed instantly instead of
// falling back to a full reload after storage pressure. Best-effort.
if (navigator.storage?.persist) {
	void navigator.storage.persist().catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
