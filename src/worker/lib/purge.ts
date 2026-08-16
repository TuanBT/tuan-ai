import { blobs } from "./storage";
import { readSettings } from "./settings";

/**
 * KV tự xoá ảnh khi hết TTL. Việc quét ở đây lo hai chuyện TTL không lo được:
 * đánh dấu vào D1 rằng ảnh đã biến mất, và dọn sớm những bài mà thời hạn lưu
 * vừa bị rút ngắn trong phần Cài đặt.
 *
 * Chạy tự động mỗi đêm bằng cron, và bấm tay được từ trang quản trị.
 */
export async function purgeExpired(env: Env): Promise<number> {
	const settings = await readSettings(env.DB);
	const retentionMs = settings.retention_days * 86_400_000;
	const now = Date.now();

	const due = await env.DB.prepare(
		`SELECT code, images FROM submissions
		 WHERE images_purged = 0 AND MIN(expires_at, created_at + ?1) <= ?2
		 LIMIT 200`,
	)
		.bind(retentionMs, now)
		.all<{ code: string; images: string }>();

	if (!due.results.length) return 0;

	const store = blobs(env);
	for (const row of due.results) {
		const images = JSON.parse(row.images) as Array<{ key: string }>;
		await Promise.all(images.map((image) => store.delete(image.key)));
	}

	await env.DB.batch(
		due.results.map((row) =>
			env.DB.prepare(
				"UPDATE submissions SET images_purged = 1 WHERE code = ?",
			).bind(row.code),
		),
	);

	return due.results.length;
}
