import { describe, expect, it } from "vitest";
import {
	indexText,
	machineJson,
	readableText,
	vnTime,
	type SubmissionRow,
} from "../src/worker/lib/bundle";

const LABELS = new Map([
	["animate", "Cho cựa quậy, sống dậy"],
	["funny", "Miễn sao thật vui"],
]);

function row(patch: Partial<SubmissionRow> = {}): SubmissionRow {
	return {
		code: "TA-12345678",
		nickname: "Bé Na",
		email: "na@example.com",
		description: "Con gấu bông của mình, cho nó nhảy múa nhé",
		styles: '["animate","funny"]',
		images: '[{"key":"img/TA-12345678/0","type":"image/jpeg","size":1000}]',
		status: "selected",
		published_url: null,
		admin_note: null,
		lang: "vi",
		bytes: 1000,
		created_at: Date.UTC(2026, 7, 16, 3, 5),
		expires_at: 0,
		images_purged: 0,
		...patch,
	};
}

describe("vnTime", () => {
	it("đổi mốc UTC sang giờ Việt Nam", () => {
		expect(vnTime(Date.UTC(2026, 7, 16, 3, 5))).toBe("16/08/2026 10:05");
	});

	it("sang ngày mới khi cộng bảy tiếng vượt nửa đêm", () => {
		expect(vnTime(Date.UTC(2026, 7, 16, 20, 30))).toBe("17/08/2026 03:30");
	});
});

describe("readableText", () => {
	const files = [{ file: "01.jpg", type: "image/jpeg", size: 1000 }];

	it("để phần mô tả đứng riêng một khối, không dính nhãn", () => {
		const lines = readableText(row(), LABELS, files).split("\r\n");
		const at = lines.indexOf("Con gấu bông của mình, cho nó nhảy múa nhé");
		// Chép nguyên khối chỉ dễ khi dòng mô tả bắt đầu từ mép trái và hai bên là
		// đường kẻ, chứ không phải nằm sau một nhãn nào đó.
		expect(at).toBeGreaterThan(0);
		expect(lines[at - 1]).toMatch(/^-+$/);
		expect(lines[at + 1]).toMatch(/^-+$/);
	});

	it("ghi đủ những thứ cần để dựng clip", () => {
		const text = readableText(row(), LABELS, files);
		expect(text).toContain("TA-12345678");
		expect(text).toContain("Bé Na");
		expect(text).toContain("na@example.com");
		expect(text).toContain("16/08/2026 10:05");
		expect(text).toContain("Đã chọn");
		expect(text).toContain("Cho cựa quậy, sống dậy · Miễn sao thật vui");
		expect(text).toContain("01.jpg");
	});

	it("nói rõ khi trong gói không có ảnh nào", () => {
		const text = readableText(row({ images_purged: 1 }), LABELS, []);
		expect(text).toContain("ảnh gốc đã hết hạn lưu");
	});

	it("giữ mã kiểu khi chủ trang đã xoá kiểu đó khỏi bảng", () => {
		const text = readableText(row({ styles: '["da-xoa"]' }), LABELS, files);
		expect(text).toContain("da-xoa");
	});

	it("xuống dòng kiểu Windows để Notepad không dồn thành một dòng", () => {
		const text = readableText(row(), LABELS, files);
		expect(text.startsWith("\uFEFF")).toBe(true);
		expect(text).not.toMatch(/[^\r]\n/);
	});
});

describe("machineJson", () => {
	it("trả về dữ liệu đã bóc sẵn cho công cụ khác đọc", () => {
		const data = machineJson(row(), LABELS, [
			{ file: "01.jpg", type: "image/jpeg", size: 1000 },
		]);
		expect(data.code).toBe("TA-12345678");
		expect(data.styles).toEqual([
			{ id: "animate", label: "Cho cựa quậy, sống dậy" },
			{ id: "funny", label: "Miễn sao thật vui" },
		]);
		expect(data.images).toEqual([
			{ file: "01.jpg", type: "image/jpeg", size: 1000 },
		]);
		expect(data.imagesPurged).toBe(false);
	});

	it("đọc lại được bằng JSON.parse", () => {
		const text = JSON.stringify(machineJson(row(), LABELS, []), null, 2);
		expect(JSON.parse(text).nickname).toBe("Bé Na");
	});
});

describe("indexText", () => {
	it("liệt kê từng bài kèm mã để tìm đúng thư mục", () => {
		const text = indexText([row(), row({ code: "TA-87654321" })], LABELS);
		expect(text).toContain("GÓI 2 BÀI");
		expect(text).toContain("TA-12345678");
		expect(text).toContain("TA-87654321");
	});

	it("ép mô tả dài xuống một dòng để mục lục còn đọc được", () => {
		const long = row({ description: `${"a".repeat(400)}\nxuống dòng` });
		const lines = indexText([long], LABELS).split("\r\n");
		expect(lines.every((line) => line.length <= 200)).toBe(true);
	});
});
