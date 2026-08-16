import { describe, expect, it } from "vitest";
import { csvCell, readOnlySql } from "../src/worker/routes/admin";

describe("ô truy vấn chỉ cho phép đọc", () => {
	it("cho chạy câu SELECT và WITH", () => {
		expect(readOnlySql("SELECT 1")).toBe("SELECT 1 LIMIT 200");
		expect(readOnlySql("  select code from submissions  ")).toBe(
			"select code from submissions LIMIT 200",
		);
		expect(readOnlySql("WITH x AS (SELECT 1) SELECT * FROM x")).toContain("WITH");
	});

	it("giữ nguyên LIMIT người dùng tự đặt", () => {
		expect(readOnlySql("SELECT 1 LIMIT 5")).toBe("SELECT 1 LIMIT 5");
	});

	it("chặn mọi câu lệnh ghi", () => {
		for (const sql of [
			"DELETE FROM submissions",
			"UPDATE submissions SET status = 'done'",
			"INSERT INTO settings VALUES ('a','b')",
			"DROP TABLE submissions",
			"ALTER TABLE submissions ADD COLUMN x TEXT",
			"CREATE TABLE x (a TEXT)",
			"PRAGMA table_info(submissions)",
			"VACUUM",
			"ATTACH DATABASE 'x' AS y",
		]) {
			expect(readOnlySql(sql)).toBeNull();
		}
	});

	it("chặn kiểu nối nhiều câu bằng dấu chấm phẩy", () => {
		expect(readOnlySql("SELECT 1; DROP TABLE submissions")).toBeNull();
		expect(readOnlySql("SELECT 1; DELETE FROM styles;")).toBeNull();
	});

	it("bỏ qua dấu chấm phẩy thừa ở cuối câu", () => {
		expect(readOnlySql("SELECT 1;")).toBe("SELECT 1 LIMIT 200");
		expect(readOnlySql("SELECT 1;  ")).toBe("SELECT 1 LIMIT 200");
	});

	it("chặn câu rỗng", () => {
		expect(readOnlySql("")).toBeNull();
		expect(readOnlySql("   ")).toBeNull();
	});

	it("không nhầm cột created_at thành lệnh CREATE", () => {
		expect(readOnlySql("SELECT created_at FROM submissions")).toContain(
			"created_at",
		);
	});
});

describe("ô trong file CSV", () => {
	it("giữ nguyên chữ bình thường", () => {
		expect(csvCell("Tuân")).toBe("Tuân");
		expect(csvCell(1234)).toBe("1234");
		expect(csvCell(null)).toBe("");
	});

	it("bọc và nhân đôi dấu nháy khi cần", () => {
		expect(csvCell('anh noi "xin chao"')).toBe('"anh noi ""xin chao"""');
		expect(csvCell("a,b")).toBe('"a,b"');
		expect(csvCell("dòng 1\ndòng 2")).toBe('"dòng 1\ndòng 2"');
	});

	it("vô hiệu hoá công thức bảng tính do người lạ gõ vào", () => {
		// Không có dấu nháy dẫn đầu thì Excel chạy mấy ô này như công thức.
		expect(csvCell("=1+1")).toBe("'=1+1");
		expect(csvCell('=HYPERLINK("http://ke-gian","bấm đi")')).toMatch(/^"'=/);
		expect(csvCell("+84901234567")).toBe("'+84901234567");
		expect(csvCell("-2+3")).toBe("'-2+3");
		expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
	});
});
