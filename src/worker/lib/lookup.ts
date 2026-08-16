/**
 * Bộ đếm chặn dò mã, dùng chung cho *mọi* cửa dẫn vào một bài gửi.
 *
 * Mã bài là chìa khoá xem ảnh (xem `newCode` trong util.ts), và mô hình đó chỉ
 * đứng vững khi có đủ hai vế: mã khó đoán, và người đoán liên tục bị chặn. Vế
 * thứ hai nằm ở file này.
 *
 * Trước đây hai hàm này nằm ngay trong routes/public.ts, nên route OG thêm vào
 * sau ở routes/og.ts không với tới được — và thành cửa thứ ba mở toang dẫn vào
 * cùng bảng dữ liệu. Đặt ở lib/ để cửa tiếp theo, dù ai viết, cũng chỉ cách một
 * dòng import.
 */

import { clientIp, hashIp, utcDay } from "./util";

/**
 * Số lần tra trượt tối đa mỗi người mỗi ngày.
 *
 * Siết chặt được, vì người thật gần như không bao giờ gõ sai mã tới ngần này:
 * họ dán mã từ tin nhắn hoặc bấm từ danh sách trong máy.
 */
export const MAX_LOOKUP_MISSES = 30;

/**
 * Trần cho cả lượt tra trúng.
 *
 * Rộng hơn hẳn trần lượt trượt vì tra trúng là việc bình thường: người gửi mở
 * lại bài của mình mỗi ngày vài lần là chuyện thường tình, và mỗi lượt như vậy
 * chỉ tốn một đơn vị ở đây.
 *
 * Nó không nhắm vào người dùng mà nhắm vào việc thu hoạch hàng loạt: kẻ đã dò
 * ra danh sách mã thật ở đâu đó vẫn phải đi qua cửa này để lấy nội dung, và
 * ngần này lượt một ngày thì không gom nổi kho ảnh. Đây là lớp phòng thủ theo
 * chiều sâu — nó có tác dụng ngay cả khi một cửa nào đó lại quên mang theo
 * khoá, đúng kiểu lỗi đã xảy ra một lần với route OG.
 */
export const MAX_LOOKUP_HITS = 300;

/** Danh tính của một lượt tra, đã băm sẵn. Dựng một lần rồi dùng cho cả route. */
export interface LookupGuard {
	ipHash: string;
	day: string;
}

/**
 * Không bao giờ giữ IP thô: chỉ cần một mã băm ổn định trong ngày là đủ để đếm.
 */
export async function lookupGuard(
	req: Request,
	secret: string,
): Promise<LookupGuard> {
	return {
		ipHash: await hashIp(clientIp(req), secret),
		day: utcDay(),
	};
}

/**
 * Đã vượt ngưỡng hay chưa.
 *
 * Phải hỏi *trước* khi trả lời, chứ không phải đếm sau: đếm sau thì người đã
 * vượt ngưỡng vẫn dò tiếp được, đoán trúng là vẫn được phục vụ, và cái gọi là
 * giới hạn thành ra không giới hạn gì cả.
 */
export async function overLookupLimit(
	db: D1Database,
	guard: LookupGuard,
): Promise<boolean> {
	const seen = await db
		.prepare(
			"SELECT misses, hits FROM lookup_misses WHERE ip_hash = ? AND day = ?",
		)
		.bind(guard.ipHash, guard.day)
		.first<{ misses: number; hits: number }>();

	return (
		(seen?.misses ?? 0) >= MAX_LOOKUP_MISSES ||
		(seen?.hits ?? 0) >= MAX_LOOKUP_HITS
	);
}

/*
 * Hai câu lệnh viết sẵn thay vì ghép tên cột vào chuỗi: tên cột nối bằng chuỗi
 * là thói quen dẫn thẳng tới lỗ SQL injection ở lần sửa sau, khi cái tên đó
 * bỗng đến từ đâu đó ngoài file này.
 */
const BUMP = {
	misses: `INSERT INTO lookup_misses (ip_hash, day, misses, hits) VALUES (?1, ?2, 1, 0)
	         ON CONFLICT(ip_hash, day) DO UPDATE SET misses = misses + 1`,
	hits: `INSERT INTO lookup_misses (ip_hash, day, misses, hits) VALUES (?1, ?2, 0, 1)
	       ON CONFLICT(ip_hash, day) DO UPDATE SET hits = hits + 1`,
} as const;

async function bump(
	db: D1Database,
	guard: LookupGuard,
	column: keyof typeof BUMP,
): Promise<void> {
	await db.prepare(BUMP[column]).bind(guard.ipHash, guard.day).run();
}

/** Đoán sai một mã. */
export async function noteLookupMiss(
	db: D1Database,
	guard: LookupGuard,
): Promise<void> {
	await bump(db, guard, "misses");
}

/**
 * Mở được một bài có thật.
 *
 * Chỉ gọi ở những cửa *khám phá* — nơi người ta đưa vào một mã và biết được nó
 * có tồn tại hay không (`/api/s` và `/r`). Đường lấy ảnh `/i` cố ý không gọi:
 * ảnh chỉ tải được sau khi đã biết mã, nên đếm ở đó là đếm lại đúng lượt vừa
 * đếm, mà lại thêm một lượt ghi D1 vào mỗi tấm ảnh hiện ra trên màn hình. Ai dò
 * thẳng ở `/i` thì vẫn vướng trần lượt trượt như thường.
 */
export async function noteLookupHit(
	db: D1Database,
	guard: LookupGuard,
): Promise<void> {
	await bump(db, guard, "hits");
}
