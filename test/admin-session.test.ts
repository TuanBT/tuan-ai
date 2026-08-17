import { describe, expect, it } from "vitest";
import { shortName } from "../src/react-app/lib/admin-session";

describe("tên gọn của người đang đăng nhập", () => {
	it("lấy tên gọi ở cuối họ tên tiếng Việt", () => {
		expect(shortName("Bùi Thanh Tuấn")).toBe("Tuấn");
		expect(shortName("  Nguyễn  Văn   An  ")).toBe("An");
	});

	it("giữ nguyên tên một chữ", () => {
		expect(shortName("Tuan")).toBe("Tuan");
	});

	it("bỏ đuôi tên miền khi chỉ có email", () => {
		// GitHub nhiều khi không trả về tên, lúc đó `name` chính là email.
		expect(shortName("bttvn.4t@gmail.com")).toBe("bttvn.4t");
	});

	it("cắt tên dài để chân trang không vỡ hàng", () => {
		const long = "A".repeat(40);
		expect(shortName(long)).toHaveLength(21);
		expect(shortName(long).endsWith("…")).toBe(true);
	});

	it("chuỗi rỗng không thành dấu chấm lửng trơ trọi", () => {
		expect(shortName("")).toBe("");
		expect(shortName("   ")).toBe("");
	});
});
