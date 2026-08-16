import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	CSP_VALUE,
	SECURITY_HEADERS,
	TURNSTILE_ORIGIN,
} from "../src/worker/lib/headers";

/**
 * Header bảo mật phải khai hai lần: Worker lo phần API, `public/_headers` lo
 * phần tĩnh (file tĩnh phục vụ thẳng từ biên, không đi qua Worker). Hai bản
 * lệch nhau một lần rồi: CSP thiếu `connect-src` cho Turnstile ở cả hai nơi
 * làm ô chống bot trên production báo không kết nối được.
 */
function parseHeadersFile(): Record<string, string> {
	const text = readFileSync(
		new URL("../public/_headers", import.meta.url),
		"utf8",
	);
	const out: Record<string, string> = {};
	for (const line of text.split("\n")) {
		const match = /^\s{2}([A-Za-z-]+):\s*(.+)$/.exec(line);
		if (match) out[match[1]] = match[2].trim();
	}
	return out;
}

const fromFile = parseHeadersFile();

describe("public/_headers khớp với middleware của Worker", () => {
	it("khai đúng những header mà Worker khai", () => {
		expect(Object.keys(fromFile).sort()).toEqual(
			Object.keys(SECURITY_HEADERS).sort(),
		);
	});

	it("mọi giá trị giống hệt nhau", () => {
		for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
			expect(fromFile[name], `header ${name} lệch giữa hai nơi`).toBe(value);
		}
	});
});

describe("CSP không được bóp chết Turnstile", () => {
	const directives = new Map(
		CSP_VALUE.split(";").map((part) => {
			const [name, ...values] = part.trim().split(/\s+/);
			return [name, values];
		}),
	);

	// Thiếu bất kỳ cái nào trong ba directive này là ô chống bot hỏng, mỗi cái
	// hỏng một kiểu khác nhau nên rất dễ chẩn đoán nhầm.
	it.each(["script-src", "frame-src", "connect-src"])(
		"%s cho phép challenges.cloudflare.com",
		(directive) => {
			expect(directives.get(directive)).toContain(TURNSTILE_ORIGIN);
		},
	);

	it("connect-src vẫn cho phép gọi API của chính trang", () => {
		expect(directives.get("connect-src")).toContain("'self'");
	});

	it("giữ những chốt chặn cơ bản", () => {
		expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
		expect(directives.get("object-src")).toEqual(["'none'"]);
		expect(directives.get("base-uri")).toEqual(["'none'"]);
		expect(directives.get("default-src")).toEqual(["'self'"]);
	});

	it("ảnh chạy được: ảnh của trang, favicon data:, ảnh xem trước blob:", () => {
		expect(directives.get("img-src")).toEqual(
			expect.arrayContaining(["'self'", "data:", "blob:"]),
		);
	});
});
