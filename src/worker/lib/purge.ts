import { blobs } from "./storage";
import { readSettings } from "./settings";
import { utcDay } from "./util";

/** Số dòng mỗi lượt quét, đủ nhỏ để một câu D1 không quá nặng. */
const BATCH = 200;

/**
 * Trần an toàn cho một lần chạy cron, để bản quét không chạy vô tận nếu có gì
 * đó khiến `images_purged` không bao giờ được đánh dấu.
 */
const MAX_PER_RUN = 5_000;

/** Giữ bộ đếm chặn dò mã ngần này ngày rồi xoá. */
const LOOKUP_MISS_DAYS = 7;

export interface PurgeReport {
	images: number;
	identitiesCleared: number;
}

/**
 * KV tự xoá ảnh khi hết TTL. Việc quét ở đây lo ba chuyện TTL không lo được:
 * đánh dấu vào D1 rằng ảnh đã biến mất, dọn sớm những bài mà thời hạn lưu vừa
 * bị rút ngắn trong phần Cài đặt, và xoá phần danh tính đã quá hạn giữ.
 *
 * Chạy tự động mỗi đêm bằng cron, và bấm tay được từ trang quản trị.
 */
export async function purgeExpired(env: Env): Promise<PurgeReport> {
	const settings = await readSettings(env.DB);
	const retentionMs = settings.retention_days * 86_400_000;
	const now = Date.now();
	const store = blobs(env);
	let images = 0;

	// Lặp cho tới khi hết bài quá hạn. Trước đây chỉ quét đúng một lượt 200 dòng
	// mỗi đêm, nên chạy hết công suất là tồn đọng dồn lại mãi không bao giờ hết.
	while (images < MAX_PER_RUN) {
		const due = await env.DB.prepare(
			`SELECT code, images FROM submissions
			 WHERE images_purged = 0 AND MIN(expires_at, created_at + ?1) <= ?2
			 LIMIT ?3`,
		)
			.bind(retentionMs, now, BATCH)
			.all<{ code: string; images: string }>();

		if (!due.results.length) break;

		for (const row of due.results) {
			const parsed = JSON.parse(row.images) as Array<{ key: string }>;
			await Promise.all(parsed.map((image) => store.delete(image.key)));
		}

		await env.DB.batch(
			due.results.map((row) =>
				env.DB.prepare(
					"UPDATE submissions SET images_purged = 1 WHERE code = ?",
				).bind(row.code),
			),
		);

		images += due.results.length;
		if (due.results.length < BATCH) break;
	}

	const cutoff = now - settings.data_retention_days * 86_400_000;

	/*
	 * Sau hạn giữ dữ liệu thì phần danh tính phải đi, nhưng dòng thì ở lại.
	 *
	 * Trước đây bài không lên sóng bị xoá sạch cả dòng sau hạn này. Điều đó biến
	 * việc tra mã thành ngõ cụt đúng với những người không được chọn: cầm mã trong
	 * tay, gõ vào, nhận về "không tìm thấy". Dòng dữ liệu mô tả chỉ nặng vài trăm
	 * byte nên giữ lại không tốn gì đáng kể, còn thứ thật sự nhạy cảm — email và
	 * dấu vết địa chỉ mạng — thì xoá hẳn ở đây, cho mọi bài chứ không riêng bài
	 * nào. Người gửi một năm sau vẫn tra được mô tả, trạng thái và link đã đăng;
	 * ảnh gốc thì không, vì ảnh đã đi theo hạn ở trên.
	 *
	 * `ip_hash` chỉ dùng để đếm hạn mức trong ngày (xem routes/public.ts), nên xoá
	 * dấu vết cũ không ảnh hưởng gì tới việc chặn spam.
	 */
	const cleared = await env.DB.prepare(
		`UPDATE submissions SET email = NULL, ip_hash = NULL
		 WHERE created_at < ?1 AND (email IS NOT NULL OR ip_hash IS NOT NULL)`,
	)
		.bind(cutoff)
		.run();

	// Bộ đếm chặn dò mã chỉ có ý nghĩa trong ngày của nó; không dọn thì bảng này
	// phình ra mãi.
	await env.DB.prepare("DELETE FROM lookup_misses WHERE day < ?1")
		.bind(utcDay(new Date(now - LOOKUP_MISS_DAYS * 86_400_000)))
		.run();

	return { images, identitiesCleared: cleared.meta.changes ?? 0 };
}
