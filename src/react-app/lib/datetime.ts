import type { Lang } from "./i18n";

/**
 * Ngày giờ hiển thị trên giao diện.
 *
 * Trước đây mỗi chỗ tự gọi `toLocaleDateString` với một locale khác nhau: trang
 * tra cứu theo ngôn ngữ đang chọn, khu quản trị ghim "vi-VN", chân trang thì ra
 * cả giây. Cùng một mốc thời gian mà đọc ở hai trang lại thấy hai kiểu, nên
 * không so được bài nào trước bài nào.
 *
 * Một dạng duy nhất, và tháng luôn viết thành chữ: `16 Tháng 8, 2026`, bản tiếng
 * Anh là `16 Aug 2026`. Toàn số thì "04/08" với "08/04" nhìn y hệt nhau, người
 * quen kiểu Mỹ đọc ra một ngày, người Việt đọc ra ngày khác — mà đây là chỗ nói
 * cho người gửi biết bài của họ đi từ hôm nào.
 *
 * Múi giờ ghim ở Việt Nam, không lấy theo máy người xem: "gửi ngày 16 Tháng 8"
 * phải là ngày 16 theo giờ của kênh, kể cả khi người xem đang ở múi giờ khác.
 */
const TZ = "Asia/Ho_Chi_Minh";

const MONTHS: Record<Lang, string[]> = {
	vi: [
		"Tháng 1",
		"Tháng 2",
		"Tháng 3",
		"Tháng 4",
		"Tháng 5",
		"Tháng 6",
		"Tháng 7",
		"Tháng 8",
		"Tháng 9",
		"Tháng 10",
		"Tháng 11",
		"Tháng 12",
	],
	en: [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	],
};

const parts = new Intl.DateTimeFormat("en-GB", {
	timeZone: TZ,
	day: "2-digit",
	month: "numeric",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
});

type Stamp = number | string | Date;

/** Tách sẵn từng mảnh, vì `format()` của mỗi trình duyệt chèn dấu một kiểu. */
function pieces(at: Stamp, lang: Lang) {
	const found = parts.formatToParts(new Date(at));
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		found.find((part) => part.type === type)?.value ?? "";
	return {
		day: get("day"),
		month: MONTHS[lang][Number(get("month")) - 1] ?? get("month"),
		year: get("year"),
		// Nửa đêm ra "24" ở một số trình duyệt khi hour12 tắt.
		hour: get("hour") === "24" ? "00" : get("hour"),
		minute: get("minute"),
	};
}

/**
 * Ngày, tháng viết chữ, rồi năm.
 *
 * Tiếng Việt có dấu phẩy trước năm cho khớp với các dòng ngày tháng viết tay
 * sẵn trong bản dịch; tiếng Anh thì `16 Aug 2026` mới là dạng người ta quen.
 */
export function formatDate(at: Stamp, lang: Lang = "vi"): string {
	const p = pieces(at, lang);
	return lang === "vi"
		? `${p.day} ${p.month}, ${p.year}`
		: `${p.day} ${p.month} ${p.year}`;
}

/** Như trên, kèm giờ 24: `16 Tháng 8, 2026 · 14:32`. */
export function formatDateTime(at: Stamp, lang: Lang = "vi"): string {
	const p = pieces(at, lang);
	return `${formatDate(at, lang)} · ${p.hour}:${p.minute}`;
}

/** Giá trị cho thuộc tính `dateTime` của thẻ `<time>`. */
export function isoStamp(at: Stamp): string {
	return new Date(at).toISOString();
}
