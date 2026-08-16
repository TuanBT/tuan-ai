import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Worker và tầng static asset tranh nhau cùng một không gian đường dẫn.
 *
 * `not_found_handling: single-page-application` trả `index.html` cho mọi điều
 * hướng không khớp file tĩnh, kể cả `/auth/google`. Trình duyệt gửi
 * `Accept: text/html` nên bị nuốt, còn `curl` trần thì không, nên lỗi này chỉ
 * hiện ra khi bấm bằng chuột: React Router thấy đường lạ, rơi vào `path="*"` và
 * đá người dùng về trang chủ. Đăng nhập không bao giờ xong.
 *
 * `run_worker_first` trong wrangler.json là thứ giành lại những đường đó. Test
 * này bắt buộc mọi tiền tố mà Worker đăng ký đều phải có tên trong danh sách.
 */
const ROUTES_DIR = new URL("../src/worker/routes/", import.meta.url);
const HONO_CALL = /\bapp\.(?:get|post|put|patch|delete|use|all)\(\s*"([^"]+)"/g;

function workerPrefixes(): Set<string> {
	const prefixes = new Set<string>();
	for (const file of readdirSync(ROUTES_DIR)) {
		if (!file.endsWith(".ts")) continue;
		const source = readFileSync(new URL(file, ROUTES_DIR), "utf8");
		for (const [, path] of source.matchAll(HONO_CALL)) {
			const segment = path.split("/")[1];
			if (segment && !segment.startsWith(":")) prefixes.add(segment);
		}
	}
	return prefixes;
}

function runWorkerFirst(): string[] {
	const config = JSON.parse(
		readFileSync(new URL("../wrangler.json", import.meta.url), "utf8"),
	);
	return config.assets?.run_worker_first ?? [];
}

describe("Worker giữ được những đường của nó", () => {
	const prefixes = [...workerPrefixes()].sort();
	const claimed = runWorkerFirst();

	it("tìm thấy route trong mã nguồn (nếu rỗng thì regex đã hỏng)", () => {
		expect(prefixes.length).toBeGreaterThan(0);
		expect(prefixes).toContain("api");
		expect(prefixes).toContain("auth");
	});

	it.each(["api", "auth", "i"])(
		"/%s/* nằm trong run_worker_first",
		(prefix) => {
			expect(claimed).toContain(`/${prefix}/*`);
		},
	);

	it("mọi tiền tố Worker đăng ký đều được giành trước", () => {
		const missing = prefixes.filter(
			(prefix) => !claimed.includes(`/${prefix}/*`),
		);
		expect(
			missing,
			`thiếu trong wrangler.json → assets.run_worker_first: ${missing.join(", ")}`,
		).toEqual([]);
	});

	it("không giành nhầm những đường của giao diện", () => {
		// Các đường này phải trả index.html cho React Router lo.
		// `/r/*` không nằm ở đây: nó đi qua Worker trước để route OG trả meta tags
		// cho bot crawler, rồi `next()` để SPA phục vụ người dùng bình thường.
		for (const spa of ["/admin/*", "/*"]) {
			expect(claimed).not.toContain(spa);
		}
	});
});
