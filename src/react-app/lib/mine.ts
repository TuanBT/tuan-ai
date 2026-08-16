import { readLocal, removeLocal, writeLocal } from "./local";

/**
 * Danh sách mã bài đã gửi, lưu ngay trong trình duyệt của người dùng.
 *
 * Không có tài khoản, nên mã bài chính là chìa khoá: mất mã là mất bài vĩnh
 * viễn. Cái này chỉ là bookmark tự động: người vừa mở /r/TA-... thì mã đã nằm
 * trong lịch sử trình duyệt rồi, lưu thêm ở đây không mở ra đường vào nào mới.
 *
 * Chỉ giữ mã và tên hiển thị. Ảnh, mô tả, email không bao giờ chạm tới chỗ này;
 * trạng thái bài luôn hỏi lại máy chủ, vì nó đổi khi bài được duyệt.
 *
 * Và nó là tiện ích chứ không phải nơi cất giữ: Safari xoá storage sau 7 ngày
 * không ai vào trang, chưa kể chế độ ẩn danh, dọn dữ liệu duyệt web hay đổi
 * máy. Màn hình gửi bài xong vẫn phải phô mã ra và khuyên người dùng chép lại.
 */
const KEY = "tuanai_mine_v1";
const MAX_ENTRIES = 20;

export interface MineEntry {
	code: string;
	nickname: string;
	at: number;
}

function isEntry(value: unknown): value is MineEntry {
	if (!value || typeof value !== "object") return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.code === "string" &&
		/^TA-\d{8}$/.test(entry.code) &&
		typeof entry.nickname === "string" &&
		typeof entry.at === "number"
	);
}

/** Mới nhất trước. Bỏ qua mọi thứ không đúng dạng thay vì ném lỗi. */
export function mine(): MineEntry[] {
	const raw = readLocal(KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isEntry).sort((a, b) => b.at - a.at);
	} catch {
		return [];
	}
}

export function remember(code: string, nickname: string): void {
	const entry: MineEntry = { code, nickname, at: Date.now() };
	const next = [entry, ...mine().filter((item) => item.code !== code)].slice(
		0,
		MAX_ENTRIES,
	);
	writeLocal(KEY, JSON.stringify(next));
	announce();
}

/** Không truyền mã thì xoá sạch danh sách. */
export function forget(code?: string): void {
	if (!code) {
		removeLocal(KEY);
	} else {
		writeLocal(KEY, JSON.stringify(mine().filter((item) => item.code !== code)));
	}
	announce();
}

/**
 * Con số trên thanh điều hướng phải khớp với danh sách ngay lập tức.
 *
 * `storage` chỉ báo cho *tab khác*, nên tab đang thao tác cần một tiếng gọi
 * riêng, không có nó thì người vừa gửi bài xong vẫn thấy huy hiệu đếm số cũ cho
 * tới lần chuyển trang kế tiếp.
 */
const CHANGED = "tuanai:mine";

function announce(): void {
	if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED));
}

export function subscribeMine(listener: () => void): () => void {
	window.addEventListener(CHANGED, listener);
	window.addEventListener("storage", listener);
	return () => {
		window.removeEventListener(CHANGED, listener);
		window.removeEventListener("storage", listener);
	};
}
