import { defineConfig } from "vitest/config";

/**
 * Cấu hình riêng, không dùng vite.config.ts: file đó nạp plugin Cloudflare để
 * dựng cả một Worker giả, thừa thãi với mấy hàm thuần tuý ở đây.
 */
export default defineConfig({
	test: {
		environment: "node",
		include: ["test/**/*.test.ts"],
	},
});
