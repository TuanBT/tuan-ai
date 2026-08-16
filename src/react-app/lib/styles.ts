import type { Lang } from "./i18n";

/** Đủ để đặt tên cho một kiểu; hợp với cả `Style` lẫn `AdminStyle`. */
interface Named {
	id: string;
	label_vi: string;
	label_en: string;
}

/**
 * Tên kiểu để bày ra màn hình.
 *
 * Bài gửi chỉ lưu mã kiểu (`surprise`, `funny`…), vốn là mã tiếng Anh dành cho
 * máy. Bày thẳng mã ra thì người Việt đọc được một chữ tiếng Anh cụt lủn, còn
 * người quản trị nhìn bài cũng không biết người gửi đã chọn gì.
 *
 * Không tra ra thì trả lại chính mã: bài cũ có thể mang kiểu mà chủ trang đã xoá
 * hoặc tắt trong /admin, và một mã lạ vẫn còn hơn một khoảng trống.
 */
export function styleName(
	styles: Named[] | undefined,
	id: string,
	lang: Lang,
): string {
	const found = styles?.find((style) => style.id === id);
	if (!found) return id;
	return (lang === "vi" ? found.label_vi : found.label_en) || found.label_vi;
}

export function styleNames(
	styles: Named[] | undefined,
	ids: string[],
	lang: Lang,
): string[] {
	return ids.map((id) => styleName(styles, id, lang));
}
