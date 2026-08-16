import { blobs } from "./storage";
import { readSettings } from "./settings";
import { utcDay } from "./util";

/** Số dòng mỗi lượt quét — đủ nhỏ để một câu D1 không quá nặng. */
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
	rowsDeleted: number;
	emailsCleared: number;
}

/**
 * KV tự xoá ảnh khi hết TTL. Việc quét ở đây lo ba chuyện TTL không lo được:
 * đánh dấu vào D1 rằng ảnh đã biến mất, dọn sớm những bài mà thời hạn lưu vừa
 * bị rút ngắn trong phần Cài đặt, và dọn dữ liệu mô tả đã quá hạn giữ.
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
	 * Sau hạn giữ dữ liệu thì phần mô tả cũng phải đi, không chỉ ảnh — trước đây
	 * email và mô tả của người lạ nằm lại trong D1 vĩnh viễn dù trang có hứa là
	 * dữ liệu tự xoá.
	 *
	 * Bài đã lên sóng thì giữ lại dòng (khu "Đã lên sóng" ngoài trang chủ đọc từ
	 * đây) nhưng xoá email đi, vì email là thứ duy nhất mang tính cá nhân.
	 * `images_purged = 1` là điều kiện bắt buộc trước khi xoá dòng: xoá sớm hơn
	 * là ảnh nằm lại trong kho mà không còn ai biết đường dọn.
	 */
	const published = "published_url IS NOT NULL AND published_url <> ''";

	const cleared = await env.DB.prepare(
		`UPDATE submissions SET email = NULL
		 WHERE email IS NOT NULL AND created_at < ?1 AND ${published}`,
	)
		.bind(cutoff)
		.run();

	const deleted = await env.DB.prepare(
		`DELETE FROM submissions
		 WHERE created_at < ?1 AND images_purged = 1 AND NOT (${published})`,
	)
		.bind(cutoff)
		.run();

	// Bộ đếm chặn dò mã chỉ có ý nghĩa trong ngày của nó; không dọn thì bảng này
	// phình ra mãi.
	await env.DB.prepare("DELETE FROM lookup_misses WHERE day < ?1")
		.bind(utcDay(new Date(now - LOOKUP_MISS_DAYS * 86_400_000)))
		.run();

	return {
		images,
		rowsDeleted: deleted.meta.changes ?? 0,
		emailsCleared: cleared.meta.changes ?? 0,
	};
}
