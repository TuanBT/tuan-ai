export interface Settings {
	retention_days: number;
	data_retention_days: number;
	max_images: number;
	daily_write_budget: number;
	max_per_ip_day: number;
	submissions_open: boolean;
	/**
	 * Đóng cả trang để sửa chữa, khác hẳn với `submissions_open`.
	 *
	 * Tắt nhận bài là trang vẫn chạy, chỉ không nhận bài mới; người cầm mã vẫn
	 * tra được. Bảo trì là dừng hẳn: trang chủ, tra cứu, thư viện đều đóng, vì
	 * lúc đang sửa dữ liệu thì thứ trang trả về chưa chắc còn đúng.
	 */
	maintenance_mode: boolean;
	/** Lời nhắn kèm theo, ví dụ "quay lại lúc 15h". Để trống thì dùng câu mặc định. */
	maintenance_note: string;
	site_title: string;
	tagline_vi: string;
	tagline_en: string;
	tiktok_url: string;
	youtube_url: string;
}

const FALLBACK: Settings = {
	retention_days: 7,
	data_retention_days: 90,
	// Hai tấm là đủ cho một clip: gần như mọi bài chỉ cần đúng một tấm, tấm thứ
	// hai để đổi góc. Mở tới ba chỉ làm bước chọn ảnh dài ra và gói tải nặng thêm.
	max_images: 2,
	daily_write_budget: 850,
	/**
	 * Số bài mỗi IP mỗi ngày.
	 *
	 * Từng để ở 3, và con số đó ngầm giả định mỗi IP là một người. Giả định ấy
	 * sai với phần lớn người dùng ở đây: khách vào từ TikTok gần như toàn bằng
	 * điện thoại, mà thuê bao 4G đi ra ngoài qua CGNAT, hàng trăm người chung
	 * một địa chỉ. Ở mức 3, người thứ tư sau cùng một nhà mạng điền xong form,
	 * chọn ảnh, giải captcha rồi mới nhận về lỗi, dù chẳng làm gì sai. Ngày đông
	 * khách nhất thành ngày mất khách nhất.
	 *
	 * Nới ra được là vì trần này chưa bao giờ là thứ bảo vệ hạn mức hạ tầng:
	 * `daily_write_budget` mới là, và nó chặn ở tầng cả trang nên không phụ
	 * thuộc vào chuyện đếm IP có đúng hay không. Đây chỉ là lớp chống một người
	 * gửi hàng loạt, mà việc đó Turnstile đã lọc ở tuyến đầu rồi.
	 */
	max_per_ip_day: 20,
	submissions_open: true,
	// Mặc định phải là tắt: hàng rào bảo trì mà tự dựng lên vì thiếu một dòng
	// trong bảng settings thì cả trang đóng mà không ai bấm gì.
	maintenance_mode: false,
	maintenance_note: "",
	site_title: "Tuân AI",
	tagline_vi: "Gửi ảnh, nhận clip AI vui vẻ",
	tagline_en: "Send photos, get fun AI clips",
	// Rỗng nghĩa là chưa khai báo, giao diện giấu hẳn nút thay vì dẫn đi đâu đó.
	tiktok_url: "",
	youtube_url: "",
};

/**
 * Đường dẫn kênh do người quản trị gõ tay, rồi đổ thẳng vào `href`. Gõ nhầm
 * thành `javascript:…` là mở đường chạy mã ngay trên trang, nên chỉ nhận đúng
 * hai giao thức của web; còn lại coi như chưa khai báo.
 */
function safeUrl(value: string | undefined): string {
	if (!value) return "";
	try {
		const url = new URL(value.trim());
		return url.protocol === "https:" || url.protocol === "http:"
			? url.toString()
			: "";
	} catch {
		return "";
	}
}

/** Giới hạn an toàn. Chặn việc gõ nhầm trong /admin làm hỏng cả trang. */
const BOUNDS: Record<string, [number, number]> = {
	retention_days: [1, 365],
	// Hạn giữ email. Dưới 7 ngày thì gõ nhầm một con số là email của cả tuần vừa
	// rồi biến mất trong lần quét đêm kế tiếp, không lấy lại được.
	data_retention_days: [7, 3650],
	max_images: [1, 5],
	daily_write_budget: [10, 1000],
	// Trần trên nới rộng để nâng được từ trang Cài đặt mà không phải deploy lại:
	// lúc phát hiện đang chặn nhầm người dùng thì thứ cần nhất là sửa được ngay.
	// Vẫn giữ một trần, vì đây là ô nhập tay và gõ thừa số 0 là chuyện có thật.
	max_per_ip_day: [1, 200],
};

/** Đọc cấu hình từ kết quả truy vấn có sẵn. Dùng khi đã gộp nhiều query. */
export function parseSettings(
	rows: Array<{ key: string; value: string }>,
): Settings {
	const raw = new Map(rows.map((r) => [r.key, r.value]));
	const num = (key: keyof Settings, fallback: number) => {
		const parsed = Number(raw.get(key));
		if (!Number.isFinite(parsed)) return fallback;
		const [min, max] = BOUNDS[key] ?? [-Infinity, Infinity];
		return Math.min(max, Math.max(min, Math.trunc(parsed)));
	};

	const retention = num("retention_days", FALLBACK.retention_days);
	return {
		retention_days: retention,
		// Giữ email không bao giờ được ngắn hơn giữ ảnh: người gửi còn xem được ảnh
		// của mình mà chỗ liên lạc để báo tin đã bị xoá là chuyện ngược đời.
		data_retention_days: Math.max(
			retention,
			num("data_retention_days", FALLBACK.data_retention_days),
		),
		max_images: num("max_images", FALLBACK.max_images),
		daily_write_budget: num("daily_write_budget", FALLBACK.daily_write_budget),
		max_per_ip_day: num("max_per_ip_day", FALLBACK.max_per_ip_day),
		submissions_open: (raw.get("submissions_open") ?? "1") === "1",
		// Chỉ đúng chữ "1" mới là đang bảo trì. Giá trị lạ trong bảng (chuỗi rỗng,
		// "true", dòng bị xoá) đều hiểu là trang đang mở.
		maintenance_mode: raw.get("maintenance_mode") === "1",
		maintenance_note: (raw.get("maintenance_note") ?? "").trim(),
		site_title: raw.get("site_title") || FALLBACK.site_title,
		tagline_vi: raw.get("tagline_vi") || FALLBACK.tagline_vi,
		tagline_en: raw.get("tagline_en") || FALLBACK.tagline_en,
		tiktok_url: safeUrl(raw.get("tiktok_url")),
		youtube_url: safeUrl(raw.get("youtube_url")),
	};
}

export const SETTINGS_QUERY = "SELECT key, value FROM settings";

export async function readSettings(db: D1Database): Promise<Settings> {
	const rows = await db
		.prepare(SETTINGS_QUERY)
		.all<{ key: string; value: string }>();
	return parseSettings(rows.results);
}

export async function writeSettings(
	db: D1Database,
	patch: Record<string, string>,
): Promise<void> {
	const allowed = new Set(Object.keys(FALLBACK));
	const statements = Object.entries(patch)
		.filter(([key]) => allowed.has(key))
		.map(([key, value]) =>
			db
				.prepare(
					"INSERT INTO settings (key, value) VALUES (?, ?) " +
						"ON CONFLICT(key) DO UPDATE SET value = excluded.value",
				)
				.bind(key, String(value).slice(0, 500)),
		);

	if (statements.length) await db.batch(statements);
}
