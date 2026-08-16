import type { api } from "../../lib/api";

export type Me = Awaited<ReturnType<typeof api.me>>;

export const DEV_MODE_COOKIE = "tuanai_devmode";

/**
 * Bật tắt chế độ xem giống production ngay trên máy: tắt cửa sau đăng nhập để
 * thấy đúng những gì người lạ thấy, không phải deploy mới kiểm tra được.
 */
export function setProdPreview(on: boolean) {
	document.cookie = on
		? `${DEV_MODE_COOKIE}=prod; path=/; max-age=86400; SameSite=Lax`
		: `${DEV_MODE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
	window.location.href = "/admin";
}

/**
 * Số bài tối đa trong một gói tải cả đợt. Phải khớp `MAX_BUNDLE` bên
 * `src/worker/routes/admin.ts`; lệch nhau thì nhãn nút hứa nhiều hơn thứ tải về.
 */
export const BUNDLE_LIMIT = 25;

export const STATUS_LABEL: Record<string, string> = {
	new: "Mới",
	selected: "Đã chọn",
	done: "Đã lên sóng",
	rejected: "Bỏ qua",
};

/** Lớp màu của huy hiệu trạng thái, dùng chung với giao diện người dùng. */
export const STATUS_TONE: Record<string, string> = {
	new: "",
	selected: "warn",
	done: "ok",
	rejected: "bad",
};

/**
 * "3 giờ trước" đọc nhanh hơn "16/08/2026, 14:32:07" khi đang lướt cả hộp thư
 * để xem bài nào mới tới. Quá một tháng thì ngày tháng lại rõ hơn.
 */
export function relativeTime(at: number): string {
	const minutes = Math.floor((Date.now() - at) / 60_000);
	if (minutes < 1) return "vừa xong";
	if (minutes < 60) return `${minutes} phút trước`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} giờ trước`;

	const days = Math.floor(hours / 24);
	if (days < 30) return `${days} ngày trước`;

	return new Date(at).toLocaleDateString("vi-VN");
}
