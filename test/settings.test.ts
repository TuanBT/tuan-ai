import { describe, expect, it } from "vitest";
import { parseSettings } from "../src/worker/lib/settings";

function rows(patch: Record<string, string>) {
	return Object.entries(patch).map(([key, value]) => ({ key, value }));
}

describe("công tắc bảo trì", () => {
	it("bảng rỗng nghĩa là trang đang chạy", () => {
		expect(parseSettings([]).maintenance_mode).toBe(false);
		expect(parseSettings([]).maintenance_note).toBe("");
	});

	it("chỉ đúng chữ 1 mới là đang bảo trì", () => {
		expect(parseSettings(rows({ maintenance_mode: "1" })).maintenance_mode).toBe(
			true,
		);
		for (const value of ["0", "", "true", "on", "yes", " 1"]) {
			expect(
				parseSettings(rows({ maintenance_mode: value })).maintenance_mode,
				`giá trị lạ "${value}" không được tự dựng hàng rào`,
			).toBe(false);
		}
	});

	it("cắt khoảng trắng quanh lời nhắn", () => {
		expect(
			parseSettings(rows({ maintenance_note: "  quay lại lúc 15h  " }))
				.maintenance_note,
		).toBe("quay lại lúc 15h");
	});

	it("bật bảo trì không đụng gì tới các cài đặt khác", () => {
		const settings = parseSettings(
			rows({ maintenance_mode: "1", submissions_open: "1", max_images: "2" }),
		);
		expect(settings.submissions_open).toBe(true);
		expect(settings.max_images).toBe(2);
	});
});
