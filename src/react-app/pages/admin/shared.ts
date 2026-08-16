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

export const STATUS_LABEL: Record<string, string> = {
	new: "Mới",
	selected: "Đã chọn",
	done: "Đã lên sóng",
	rejected: "Bỏ qua",
};
