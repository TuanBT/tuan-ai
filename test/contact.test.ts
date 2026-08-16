import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	forgetContact,
	hasContact,
	readContact,
	saveContact,
} from "../src/react-app/lib/contact";

/** localStorage giả, giống hệt bản dùng cho danh sách mã bài. */
function fakeStorage(broken = false) {
	const map = new Map<string, string>();
	const boom = () => {
		throw new DOMException("quota", "QuotaExceededError");
	};
	return {
		getItem: (key: string) => (broken ? boom() : (map.get(key) ?? null)),
		setItem: (key: string, value: string) =>
			broken ? boom() : void map.set(key, value),
		removeItem: (key: string) => (broken ? boom() : void map.delete(key)),
		clear: () => map.clear(),
		key: () => null,
		length: 0,
		raw: map,
	};
}

beforeEach(() => {
	vi.stubGlobal("localStorage", fakeStorage());
});

describe("tên và email nhớ trong máy", () => {
	it("bắt đầu từ rỗng", () => {
		expect(readContact()).toEqual({ nickname: "", email: "" });
		expect(hasContact()).toBe(false);
	});

	it("nhớ tên và email của lần gửi trước", () => {
		saveContact({ nickname: "Tuân", email: "tuan@example.com" });
		expect(readContact()).toEqual({
			nickname: "Tuân",
			email: "tuan@example.com",
		});
		expect(hasContact()).toBe(true);
	});

	it("cắt khoảng trắng thừa hai đầu", () => {
		saveContact({ nickname: "  Tuân  ", email: " tuan@example.com " });
		expect(readContact()).toEqual({
			nickname: "Tuân",
			email: "tuan@example.com",
		});
	});

	it("xoá ô nào thì quên ô đó, không giữ lại giá trị cũ", () => {
		saveContact({ nickname: "Tuân", email: "tuan@example.com" });
		saveContact({ nickname: "Tuân", email: "" });
		expect(readContact()).toEqual({ nickname: "Tuân", email: "" });
	});

	it("chỉ có tên cũng đã là có gì để xoá", () => {
		saveContact({ nickname: "Tuân", email: "" });
		expect(hasContact()).toBe(true);
	});

	it("quên hết khi người dùng bấm xoá khỏi máy này", () => {
		saveContact({ nickname: "Tuân", email: "tuan@example.com" });
		forgetContact();
		expect(readContact()).toEqual({ nickname: "", email: "" });
		expect(hasContact()).toBe(false);
	});

	it("cắt đúng bằng giới hạn của ô nhập, cả khi ghi lẫn khi đọc", () => {
		saveContact({ nickname: "x".repeat(80), email: `${"y".repeat(200)}@a.vn` });
		expect(readContact().nickname).toHaveLength(60);
		expect(readContact().email).toHaveLength(120);

		localStorage.setItem("tuanai_nickname", "z".repeat(200));
		expect(readContact().nickname).toHaveLength(60);
	});
});

describe("khi trình duyệt chặn localStorage", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", fakeStorage(true));
	});

	it("không ném lỗi, chỉ là không nhớ được gì", () => {
		expect(() =>
			saveContact({ nickname: "Tuân", email: "tuan@example.com" }),
		).not.toThrow();
		expect(() => forgetContact()).not.toThrow();
		expect(readContact()).toEqual({ nickname: "", email: "" });
		expect(hasContact()).toBe(false);
	});
});
