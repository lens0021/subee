import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";

export default defineConfig(({ mode }) => {
	let base = "/";

	if (mode === "production" && pkg.homepage) {
		try {
			base = new URL(pkg.homepage).pathname;
		} catch {
			base = "/";
		}
		if (!base.endsWith("/")) base = `${base}/`;
	}

	return {
		plugins: [
			react(),
			tailwindcss(),
			VitePWA({
				strategies: "generateSW",
				registerType: "autoUpdate",
				workbox: {
					// Don't precache app shell — only use SW for image caching
					globPatterns: [],
					runtimeCaching: [
						{
							urlPattern: ({ request }) => request.destination === "image",
							handler: "CacheFirst",
							options: {
								cacheName: "images",
								expiration: {
									maxEntries: 500,
									maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
								},
							},
						},
					],
				},
			}),
		],
		base,
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
			},
		},
		test: {
			environment: "jsdom",
			setupFiles: "./src/test/setup.ts",
			globals: true,
			include: ["src/**/*.{test,spec}.{ts,tsx}"],
			exclude: ["e2e/**", "node_modules/**"],
		},
	};
});
