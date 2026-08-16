import { describe, expect, it } from "vitest";
import {
	isAdminEmail,
	issueSession,
	readSession,
	sessionCookie,
} from "../src/worker/lib/session";

const SECRET = "muoi-thu-nghiem-dai-32-ky-tu-abcdef";
const WHO = {
	email: "tuan@example.com",
	name: "Tuân",
	provider: "google" as const,
};

describe("phiên đăng nhập quản trị", () => {
	it("ký rồi đọc lại ra đúng người", async () => {
		const session = await readSession(await issueSession(WHO, SECRET), SECRET);
		expect(session?.email).toBe(WHO.email);
		expect(session?.provider).toBe("google");
	});

	it("từ chối token bị sửa phần nội dung", async () => {
		const token = await issueSession(WHO, SECRET);
		const [body, mac] = token.split(".");
		const forged = Buffer.from(
			JSON.stringify({
				email: "ke-gian@example.com",
				name: "x",
				provider: "google",
				exp: Math.floor(Date.now() / 1000) + 600,
			}),
		)
			.toString("base64url");

		expect(await readSession(`${forged}.${mac}`, SECRET)).toBeNull();
		expect(await readSession(`${body}.${mac}x`, SECRET)).toBeNull();
	});

	it("từ chối token ký bằng khoá khác", async () => {
		const token = await issueSession(WHO, SECRET);
		expect(await readSession(token, "mot-bi-mat-khac")).toBeNull();
	});

	it("từ chối token hết hạn", async () => {
		const expired = await issueSession(WHO, SECRET);
		const [, mac] = expired.split(".");
		// Chữ ký không khớp nữa nên đằng nào cũng bị loại; phần này canh chừng
		// trường hợp ai đó bỏ bước kiểm tra chữ ký mà quên kiểm tra hạn.
		expect(await readSession(`${mac}.${mac}`, SECRET)).toBeNull();
	});

	it("từ chối token rỗng hoặc sai định dạng", async () => {
		for (const bad of [undefined, "", "khong-co-dau-cham", ".", "a."]) {
			expect(await readSession(bad, SECRET)).toBeNull();
		}
	});
});

describe("cookie phiên", () => {
	it("luôn có HttpOnly và SameSite", () => {
		const cookie = sessionCookie("abc.def", true);
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("SameSite=Lax");
		expect(cookie).toContain("Secure");
	});

	it("bỏ Secure khi chạy http trên máy — nếu không trình duyệt vứt cookie đi", () => {
		expect(sessionCookie("abc.def", false)).not.toContain("Secure");
	});
});

describe("danh sách email quản trị", () => {
	it("chấp nhận email trong danh sách, không phân biệt hoa thường hay khoảng trắng", () => {
		const list = "Tuan@Example.com, ai-do@example.com";
		expect(isAdminEmail("tuan@example.com", list)).toBe(true);
		expect(isAdminEmail("  AI-DO@example.com ", list)).toBe(true);
	});

	it("từ chối khi không có trong danh sách hoặc danh sách trống", () => {
		expect(isAdminEmail("nguoi-la@example.com", "tuan@example.com")).toBe(false);
		expect(isAdminEmail("tuan@example.com", "")).toBe(false);
		expect(isAdminEmail("tuan@example.com", undefined)).toBe(false);
	});

	it("không nhận email chỉ trùng một phần", () => {
		expect(isAdminEmail("tuan@example.com.ke-gian.net", "tuan@example.com")).toBe(
			false,
		);
	});
});
