import { NavLink } from "react-router-dom";
import { formatDateTime, formatDayTime } from "../lib/datetime";
import { useLang } from "../lib/lang-context";
import { useSiteConfig } from "../lib/site-config";
import { ChannelLinksRow } from "./Channels";

/**
 * Chân trang dùng chung.
 *
 * Trước đây mỗi trang tự dựng lấy một bản: trang chính có nút kênh, dòng bản
 * quyền và số hiệu bản dựng; hai trang pháp lý chỉ có dòng bản quyền cùng một
 * liên kết chéo sang nhau. Ba bản khác nhau nên chân trang đổi hình mỗi lần
 * người đọc bước sang trang khác. Một bản duy nhất ở đây, mọi trang gọi vào.
 *
 * Bố cục còn hai tầng chung một trục lề, thay cho ba dải mỗi dải căn một kiểu.
 */
export function SiteFooter({ legal = false }: { legal?: boolean }) {
	const { lang, t } = useLang();
	const { config } = useSiteConfig();

	const channels = config?.channels;
	const hasChannels = Boolean(channels?.tiktok || channels?.youtube);
	const siteTitle = config?.siteTitle ?? "Tuân AI";

	// Mốc này để chủ trang biết bản vừa đẩy lên đã tới nơi chưa, nên viên thuốc
	// chỉ cần ngày giờ ngắn; đủ năm thì để trong tooltip.
	const builtShort = formatDayTime(__BUILD_TIME__, lang);
	const builtFull = formatDateTime(__BUILD_TIME__, lang);

	return (
		<footer className="footer">
			{hasChannels && (
				<div className="footer-top">
					<p className="footer-label">{t.footerChannels}</p>
					<ChannelLinksRow channels={channels} />
				</div>
			)}

			<div className="footer-base">
				{/* Chân trang trang chính không bày điều khoản với quyền riêng tư: người
				    đến từ TikTok vào đây để gửi ảnh, không phải để đọc luật. Hai trang
				    đó chỉ dẫn qua lại lẫn nhau, đúng như trước.

				    Lối vào khu quản trị đứng cuối và nhạt hơn: có mặt cho chủ trang,
				    không mời khách bấm vào. */}
				<nav
					className="footer-links"
					aria-label={lang === "vi" ? "Liên kết chân trang" : "Footer links"}
				>
					{legal && (
						<>
							<NavLink to="/terms">{t.navTerms}</NavLink>
							<NavLink to="/privacy">{t.navPrivacy}</NavLink>
						</>
					)}
					<NavLink to="/admin" className="quiet">
						{t.navAdmin}
					</NavLink>
				</nav>

				<p className="footer-meta">
					<span>
						© 2026 {siteTitle}
					</span>
					<span className="footer-build" title={builtFull}>
						v.{__BUILD_HASH__} · {builtShort}
					</span>
				</p>
			</div>
		</footer>
	);
}
