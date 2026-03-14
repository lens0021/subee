import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
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
		plugins: [react(), tailwindcss()],
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
