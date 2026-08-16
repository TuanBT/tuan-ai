import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { execSync } from "node:child_process";

function gitHash(): string {
	try {
		return execSync("git rev-parse --short HEAD").toString().trim();
	} catch {
		return "unknown";
	}
}

export default defineConfig({
	plugins: [react(), cloudflare()],
	define: {
		__BUILD_HASH__: JSON.stringify(gitHash()),
		__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
	},
});
