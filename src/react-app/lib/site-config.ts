import { useCallback, useEffect, useState } from "react";
import { api, type SiteConfig } from "./api";

/**
 * Cấu hình trang, tải một lần rồi dùng chung.
 *
 * Cả khung trang (để hiện nút kênh) lẫn trang gửi bài đều cần nó. Gọi riêng thì
 * mỗi lượt xem tốn thêm một vòng đi về D1 mà nội dung y hệt nhau.
 */
let inflight: Promise<SiteConfig> | null = null;

export function fetchSiteConfig(force = false): Promise<SiteConfig> {
	if (force || !inflight) {
		inflight = api.config().catch((err) => {
			// Nhớ kết quả thì được, nhớ cái lỗi thì không: giữ lại lời hứa hỏng sẽ
			// khiến mọi lần thử sau đều hỏng theo, kể cả khi mạng đã tốt trở lại.
			inflight = null;
			throw err;
		});
	}
	return inflight;
}

export function useSiteConfig() {
	const [config, setConfig] = useState<SiteConfig | null>(null);
	const [failed, setFailed] = useState(false);

	/** Tải lại thật, bỏ qua bản nhớ. Dùng khi hạn mức trong ngày vừa đổi. */
	const reload = useCallback(() => {
		fetchSiteConfig(true)
			.then(setConfig)
			.catch(() => setFailed(true));
	}, []);

	useEffect(() => {
		let alive = true;
		fetchSiteConfig()
			.then((data) => {
				if (alive) setConfig(data);
			})
			.catch(() => {
				if (alive) setFailed(true);
			});
		return () => {
			alive = false;
		};
	}, []);

	return { config, failed, reload };
}
