import { useState } from "react";
import { NavLink } from "react-router-dom";
import { formatDateTime } from "../lib/datetime";
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
export function SiteFooter() {
	const { lang, t } = useLang();
	const { config } = useSiteConfig();

	const channels = config?.channels;
	const hasChannels = Boolean(channels?.tiktok || channels?.youtube);
	const siteTitle = config?.siteTitle ?? "Tuân AI";

	return (
		<footer className="footer">
			{hasChannels && (
				<div className="footer-top">
					<p className="footer-label">{t.footerChannels}</p>
					<ChannelLinksRow channels={channels} />
				</div>
			)}

			<div className="footer-base">
				{/* Điều khoản và quyền riêng tư có mặt ở mọi trang: người gửi ảnh lên
				    cần tìm được chúng từ chỗ họ đang đứng, chứ không phải đoán ra rằng
				    hai trang đó chỉ dẫn sang nhau.

				    Lối vào khu quản trị đứng cuối và nhạt hơn: có mặt cho chủ trang,
				    không mời khách bấm vào. */}
				<nav
					className="footer-links"
					aria-label={lang === "vi" ? "Liên kết chân trang" : "Footer links"}
				>
					<NavLink to="/terms">{t.navTerms}</NavLink>
					<NavLink to="/privacy">{t.navPrivacy}</NavLink>
					<NavLink to="/admin" className="quiet">
						{t.navAdmin}
					</NavLink>
				</nav>

				<p className="footer-meta">
					<span>
						© 2026 {siteTitle}
					</span>
					<BuildPill />
				</p>
			</div>
		</footer>
	);
}

/**
 * Số hiệu bản dựng, mặc định chỉ hiện mã.
 *
 * Mốc thời gian dựng chỉ dùng đến khi chủ trang muốn biết bản vừa đẩy lên đã
 * tới nơi chưa, vài lần một tháng là cùng. Trước đây nó nằm sẵn cạnh mã, kéo
 * viên thuốc dài ra suốt ngày vì một câu hỏi hiếm khi được hỏi. Giờ mã đứng
 * một mình, bấm vào mới mở phần còn lại; bấm lần nữa thì thu về.
 *
 * Là nút chứ không phải tooltip: trên điện thoại không có chuột để rê, mà đây
 * lại đúng là chỗ chủ trang hay mở ra xem nhất.
 */
function BuildPill() {
	const { lang } = useLang();
	const [open, setOpen] = useState(false);

	const label = lang === "vi" ? "Thời điểm dựng bản" : "Build time";

	return (
		<button
			type="button"
			className="footer-build"
			onClick={() => setOpen((v) => !v)}
			aria-expanded={open}
			title={label}
		>
			v.{__BUILD_HASH__}
			{open && <span className="footer-build-time">{formatDateTime(__BUILD_TIME__, lang)}</span>}
		</button>
	);
}
