import { beforeEach, describe, expect, it, vi } from "vitest";
import { forget, mine, remember } from "../src/react-app/lib/mine";

/** localStorage giả, đủ dùng cho phần lưu mã bài. */
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

describe("danh sách bài đã lưu trong máy", () => {
	it("bắt đầu từ rỗng", () => {
		expect(mine()).toEqual([]);
	});

	it("nhớ mã vừa gửi", () => {
		remember("TA-12345678", "Tuân");
		expect(mine()).toHaveLength(1);
		expect(mine()[0].code).toBe("TA-12345678");
		expect(mine()[0].nickname).toBe("Tuân");
	});

	it("không lưu trùng, và lần nhớ sau đẩy mã lên đầu", () => {
		remember("TA-11111111", "A");
		remember("TA-22222222", "B");
		remember("TA-11111111", "A đổi tên");

		const list = mine();
		expect(list).toHaveLength(2);
		expect(list[0].code).toBe("TA-11111111");
		expect(list[0].nickname).toBe("A đổi tên");
	});

	it("chỉ giữ 20 mã gần nhất", () => {
		for (let i = 0; i < 25; i++) {
			remember(`TA-${String(i).padStart(8, "0")}`, "x");
		}
		const list = mine();
		expect(list).toHaveLength(20);
		expect(list[0].code).toBe("TA-00000024");
	});

	it("xoá được một mã, và xoá được cả danh sách", () => {
		remember("TA-11111111", "A");
		remember("TA-22222222", "B");

		forget("TA-11111111");
		expect(mine().map((entry) => entry.code)).toEqual(["TA-22222222"]);

		forget();
		expect(mine()).toEqual([]);
	});

	it("chỉ lưu mã và tên — không bao giờ chạm tới ảnh, mô tả hay email", () => {
		remember("TA-12345678", "Tuân");
		const stored = localStorage.getItem("tuanai_mine_v1") ?? "";
		expect(Object.keys(JSON.parse(stored)[0]).sort()).toEqual([
			"at",
			"code",
			"nickname",
		]);
	});
});

describe("chịu được dữ liệu hỏng", () => {
	it("bỏ qua JSON không đọc được", () => {
		localStorage.setItem("tuanai_mine_v1", "{khong-phai-json");
		expect(mine()).toEqual([]);
	});

	it("bỏ qua những dòng sai định dạng, giữ lại dòng đúng", () => {
		localStorage.setItem(
			"tuanai_mine_v1",
			JSON.stringify([
				{ code: "TA-12345678", nickname: "Tuân", at: 1 },
				{ code: "khong-phai-ma", nickname: "x", at: 2 },
				{ code: "TA-12345678" },
				null,
				"chuoi",
			]),
		);
		expect(mine().map((entry) => entry.code)).toEqual(["TA-12345678"]);
	});

	it("bỏ qua khi dữ liệu không phải mảng", () => {
		localStorage.setItem("tuanai_mine_v1", JSON.stringify({ code: "TA-1" }));
		expect(mine()).toEqual([]);
	});
});

describe("khi trình duyệt chặn localStorage", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", fakeStorage(true));
	});

	it("không ném lỗi, chỉ là không nhớ được gì", () => {
		expect(() => remember("TA-12345678", "Tuân")).not.toThrow();
		expect(() => forget()).not.toThrow();
		expect(mine()).toEqual([]);
	});
});
