import { utcDay } from "./util";

export interface DailyUsage {
	day: string;
	submissions: number;
	kv_writes: number;
	blocked: number;
	bytes: number;
}

const EMPTY = (day: string): DailyUsage => ({
	day,
	submissions: 0,
	kv_writes: 0,
	blocked: 0,
	bytes: 0,
});

export const USAGE_TODAY_QUERY = "SELECT * FROM daily_usage WHERE day = ?";

/** Dựng bản ghi từ kết quả có sẵn. Dùng khi đã gộp nhiều query. */
export function parseUsage(row: DailyUsage | null | undefined): DailyUsage {
	return row ?? EMPTY(utcDay());
}

export async function usageToday(db: D1Database): Promise<DailyUsage> {
	const row = await db
		.prepare(USAGE_TODAY_QUERY)
		.bind(utcDay())
		.first<DailyUsage>();
	return parseUsage(row);
}

export async function bumpUsage(
	db: D1Database,
	delta: Partial<Omit<DailyUsage, "day">>,
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO daily_usage (day, submissions, kv_writes, blocked, bytes)
			 VALUES (?1, ?2, ?3, ?4, ?5)
			 ON CONFLICT(day) DO UPDATE SET
			   submissions = submissions + excluded.submissions,
			   kv_writes   = kv_writes   + excluded.kv_writes,
			   blocked     = blocked     + excluded.blocked,
			   bytes       = bytes       + excluded.bytes`,
		)
		.bind(
			utcDay(),
			delta.submissions ?? 0,
			delta.kv_writes ?? 0,
			delta.blocked ?? 0,
			delta.bytes ?? 0,
		)
		.run();
}

/**
 * Gói miễn phí của KV cho 1.000 lượt ghi mỗi ngày UTC. Ngân sách mặc định để ở
 * 850 nhằm chừa chỗ cho thao tác quản trị và sai số đồng bộ.
 */
export function remainingWrites(
	usage: DailyUsage,
	budget: number,
): number {
	return Math.max(0, budget - usage.kv_writes);
}
