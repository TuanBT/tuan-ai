import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	lookupGuard,
	MAX_LOOKUP_HITS,
	MAX_LOOKUP_MISSES,
	noteLookupHit,
	noteLookupMiss,
	overLookupLimit,
	type LookupGuard,
} from "../src/worker/lib/lookup";

/**
 * D1 giả, chỉ hiểu đúng ba câu lệnh trong lib/lookup.ts.
 *
 * Đủ để kiểm tra phần logic đếm mà không phải dựng Miniflare cho cả bộ test;
 * xem lý do trong vitest.config.ts.
 */
function fakeDb() {
	const rows = new Map<string, { misses: number; hits: number }>();

	const db = {
		prepare(sql: string) {
			return {
				bind(...args: unknown[]) {
					const key = `${args[0]}|${args[1]}`;
					return {
						async first<T>(): Promise<T | null> {
							return (rows.get(key) ?? null) as T | null;
						},
						async run() {
							const row = rows.get(key) ?? { misses: 0, hits: 0 };
							if (sql.includes("misses = misses + 1")) row.misses += 1;
							if (sql.includes("hits = hits + 1")) row.hits += 1;
							rows.set(key, row);
						},
					};
				},
			};
		},
	};

	return { db: db as unknown as D1Database, rows };
}

const guard: LookupGuard = { ipHash: "abc123", day: "2026-08-17" };

describe("bộ đếm chặn dò mã", () => {
	it("cho qua khi chưa có dấu vết gì", async () => {
		const { db } = fakeDb();
		expect(await overLookupLimit(db, guard)).toBe(false);
	});

	it("chặn sau khi đủ số lượt trượt", async () => {
		const { db } = fakeDb();

		for (let i = 0; i < MAX_LOOKUP_MISSES - 1; i++) {
			await noteLookupMiss(db, guard);
		}
		expect(await overLookupLimit(db, guard)).toBe(false);

		await noteLookupMiss(db, guard);
		expect(await overLookupLimit(db, guard)).toBe(true);
	});

	/**
	 * Vế mới. Trước đây chỉ lượt trượt bị đếm, nên ai dò được mã thật ở một cửa
	 * không có bộ đếm thì mọi lượt sau đều là lượt trúng và không tính vào đâu,
	 * bộ đếm đứng nguyên ở 0 trong lúc kho ảnh bị múc dần.
	 */
	it("chặn cả khi toàn tra trúng, không sinh lượt trượt nào", async () => {
		const { db, rows } = fakeDb();

		for (let i = 0; i < MAX_LOOKUP_HITS; i++) {
			await noteLookupHit(db, guard);
		}

		expect(rows.get("abc123|2026-08-17")?.misses).toBe(0);
		expect(await overLookupLimit(db, guard)).toBe(true);
	});

	it("đếm trúng và trượt vào hai cột riêng", async () => {
		const { db, rows } = fakeDb();

		await noteLookupMiss(db, guard);
		await noteLookupHit(db, guard);
		await noteLookupHit(db, guard);

		expect(rows.get("abc123|2026-08-17")).toEqual({ misses: 1, hits: 2 });
	});

	/**
	 * Một IP ở đây thường là cả một nhà mạng di động chứ không phải một người
	 * (CGNAT). Ngưỡng nào cũng phải chừa chỗ cho hàng chục người dùng chung.
	 */
	it("trần lượt trượt đủ rộng cho một dải CGNAT", () => {
		expect(MAX_LOOKUP_MISSES).toBeGreaterThanOrEqual(100);
	});

	/**
	 * Kích thước không gian mã mới là thứ giữ cửa, không phải con số này. Với
	 * 100 triệu tổ hợp và 10.000 bài trong kho, đây là số ngày một người dò phải
	 * bám trên cùng một địa chỉ để mong trúng *một* bài.
	 */
	it("nới trần rồi việc dò mã vẫn vô vọng", () => {
		const soBaiGiaDinh = 10_000;
		const khongGianMa = 100_000_000;
		const soLuotCanDeTrung = khongGianMa / soBaiGiaDinh;

		expect(soLuotCanDeTrung / MAX_LOOKUP_MISSES).toBeGreaterThan(30);
	});

	it("mỗi người mỗi ngày đếm riêng", async () => {
		const { db } = fakeDb();
		const homNay: LookupGuard = { ipHash: "abc123", day: "2026-08-17" };
		const homSau: LookupGuard = { ipHash: "abc123", day: "2026-08-18" };
		const nguoiKhac: LookupGuard = { ipHash: "xyz789", day: "2026-08-17" };

		for (let i = 0; i < MAX_LOOKUP_MISSES; i++) {
			await noteLookupMiss(db, homNay);
		}

		expect(await overLookupLimit(db, homNay)).toBe(true);
		expect(await overLookupLimit(db, homSau)).toBe(false);
		expect(await overLookupLimit(db, nguoiKhac)).toBe(false);
	});

	it("không bao giờ giữ IP thô", async () => {
		const ip = "203.0.113.45";
		const built = await lookupGuard(
			new Request("https://tuanai.com/r/TA-12345678", {
				headers: { "cf-connecting-ip": ip },
			}),
			"muoi-bi-mat",
		);

		expect(built.ipHash).not.toContain(ip);
		expect(built.ipHash).toMatch(/^[0-9a-f]{32}$/);
	});
});

/**
 * Test canh cho lần sau.
 *
 * Lỗ hổng đã xảy ra thật: routes/og.ts được thêm vào sau, truy vấn đúng bảng
 * `submissions` theo mã, nhưng không mang theo bộ đếm, vì lúc đó hai hàm đếm
 * nằm khuất trong routes/public.ts. Thành cửa thứ ba dẫn vào cùng dữ liệu, mở
 * toang, và trần lượt trượt bên hai cửa kia thành vô nghĩa.
 *
 * Test này bắt mọi route công khai tra bài theo mã đều phải gọi bộ đếm, để cửa
 * thứ tư không lặp lại đúng chuyện đó.
 */
describe("mọi cửa dẫn vào bài gửi đều có khoá", () => {
	const ROUTES_DIR = new URL("../src/worker/routes/", import.meta.url);

	// admin.ts nằm sau middleware requireAdmin nên không cần: ở đó người gọi đã
	// là chủ trang, mà chủ trang thì vốn xem được mọi bài.
	const BEHIND_AUTH = new Set(["admin.ts"]);

	const files = readdirSync(ROUTES_DIR).filter(
		(file) => file.endsWith(".ts") && !BEHIND_AUTH.has(file),
	);

	it("tìm thấy file route (nếu rỗng thì đường dẫn đã hỏng)", () => {
		expect(files.length).toBeGreaterThan(0);
	});

	it.each(files)("%s", (file) => {
		const source = readFileSync(new URL(file, ROUTES_DIR), "utf8");
		const tracuuTheoMa = /FROM submissions[\s\S]{0,400}?WHERE code = \?/.test(
			source,
		);
		if (!tracuuTheoMa) return;

		expect(
			source.includes("overLookupLimit"),
			`${file} tra bài theo mã nhưng không gọi overLookupLimit: đây là cửa dò mã không khoá`,
		).toBe(true);
	});
});
