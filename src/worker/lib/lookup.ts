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
 * Từng để ở 30. Con số đó an toàn về mặt chống dò, nhưng nó đếm theo IP, mà một
 * IP ở đây thường là cả một nhà mạng di động chứ không phải một người (CGNAT).
 * Vài chục người gõ nhầm mã là cả dải bị khoá tới nửa đêm UTC.
 *
 * Nới lên vẫn an toàn, vì cái giữ cửa là kích thước không gian mã chứ không
 * phải con số này: 100 triệu tổ hợp, giả sử trong kho có 10.000 bài thì xác
 * suất trúng mỗi lượt đoán là 1/10.000. Ở mức 150 lượt/ngày, người dò cần
 * khoảng 67 ngày liên tục trên cùng một địa chỉ để mong trúng *một* bài — trong
 * khi người dùng thật có thêm gấp năm lần chỗ thở.
 */
export const MAX_LOOKUP_MISSES = 150;

/**
 * Trần cho lượt tra trúng, **chỉ áp cho `/r` chứ không áp cho `/api/s`**.
 *
 * Đây là chỗ dễ làm hỏng trải nghiệm nhất nên phải nói rõ. Trần lượt trúng sinh
 * ra để chặn thu hoạch hàng loạt, nhưng đặt nó lên `/api/s` thì nó thành trần
 * *dùng chung* trên đúng con đường người thật đi: người gửi mở lại bài của mình
 * phải chia suất với mọi thuê bao khác cùng nhà mạng, và lỗi họ nhận được là
 * "tra cứu quá nhiều" trong khi mới tra đúng một lần.
 *
 * `/r` thì khác hẳn: nó chỉ chạy khi User-Agent là bot crawler (xem
 * BOT_UA_PATTERN trong routes/og.ts), tức Facebook, Zalo, Telegram lấy preview
 * link. Không có người thật nào đi qua đó, nên trần ở đây có phơi nhiễm bằng 0.
 *
 * Chống dò không yếu đi: cửa khám phá nào cũng vẫn vướng trần lượt trượt, mà
 * muốn thu hoạch thì trước hết phải khám phá được đã.
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
 * **Chỉ gọi từ `/r`** — đường của bot crawler, nơi không có người thật nào đi
 * qua. Xem `MAX_LOOKUP_HITS` để biết vì sao `/api/s` cố ý không đếm lượt trúng.
 *
 * Đường lấy ảnh `/i` cũng không đếm, vì lý do khác: ảnh chỉ tải được sau khi đã
 * biết mã, nên đếm ở đó là đếm lại đúng lượt vừa đếm, mà lại thêm một lượt ghi
 * D1 vào mỗi tấm ảnh hiện ra trên màn hình. Ai dò thẳng ở `/i` thì vẫn vướng
 * trần lượt trượt như thường.
 */
export async function noteLookupHit(
	db: D1Database,
	guard: LookupGuard,
): Promise<void> {
	await bump(db, guard, "hits");
}
