import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import pkg from "./package.json";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
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
		build: {
			outDir: env.BUILD_DIR || "docs",
			sourcemap: mode === "development",
		},
		server: {
			port: 3000,
			open: true,
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
