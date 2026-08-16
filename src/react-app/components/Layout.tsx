import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { useLang } from "../lib/lang-context";
import { mine, subscribeMine } from "../lib/mine";
import { useSiteConfig } from "../lib/site-config";
import { useTheme } from "../lib/theme";
import { ChannelLinksRow } from "./Channels";
import { MoonIcon, SunIcon } from "./icons";

/** Số bài đã lưu trên máy này, tự cập nhật khi danh sách đổi. */
function useMineCount(): number {
	const [count, setCount] = useState(() => mine().length);
	useEffect(() => subscribeMine(() => setCount(mine().length)), []);
	return count;
}

export function Layout({
	children,
	title = "Tuân AI",
}: {
	children: ReactNode;
	title?: string;
}) {
	const { lang, t } = useLang();
	const savedCount = useMineCount();
	const { config } = useSiteConfig();

	return (
		<div className="page">
			<header className="topbar">
				<Link className="wordmark" to="/">
				<img className="wordmark-logo" src="/icons/icon.svg" alt="" width="28" height="28" />
				<span className="wordmark-text">
					<span className="wordmark-name"><Wordmark title={title} /></span>
					{config?.tagline?.[lang] && (
						<small>{config.tagline[lang]}</small>
					)}
				</span>
			</Link>
				<div className="topbar-tools">
					<ThemeToggle />
					<LangToggle />
				</div>
			</header>

			{/* Hai đường đi duy nhất của người dùng thường. Trước đây đường thứ hai
			    chỉ nằm ở chân trang, nên hầu như không ai tìm ra chỗ tra bài. */}
			<nav className="mainnav" aria-label={lang === "vi" ? "Điều hướng" : "Navigation"}>
				<NavLink to="/" end>
					{t.navSubmit}
				</NavLink>
				<NavLink to="/r">
					{t.navMine}
					{savedCount > 0 && <em className="pip">{savedCount}</em>}
				</NavLink>
			</nav>

			<MaintenanceBanner />

			{children}

			{/* Chân trang trước đây chép lại đúng hai mục của thanh điều hướng ngay
			    đầu trang, trên một trang chỉ cao vài màn hình. Giữ lại thứ không có
			    ở chỗ nào khác: đường sang kênh, và lối vào khu quản trị cho chủ
			    trang — nhỏ, đứng riêng một bên. */}
			<footer className="footer">
				<ChannelLinksRow channels={config?.channels} />
				<div className="footer-base">
					<span>© {new Date().getFullYear()} {title}</span>
					<div className="footer-links">
						<Link to="/privacy">{t.privacyTitle}</Link>
						<Link to="/terms">{t.termsTitle}</Link>
						<Link to="/admin">{t.navAdmin}</Link>
					</div>
				</div>
				<div className="footer-version">
					v.{__BUILD_HASH__} · {new Date(__BUILD_TIME__).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
				</div>
			</footer>
		</div>
	);
}

/**
 * Dải nhắc chỉ chủ trang thấy khi đang bảo trì.
 *
 * Đứng ở đây chứ không ở cạnh hàng rào trong `Maintenance.tsx`: người đi qua
 * được hàng rào thì thấy trang y như thường, dễ quên mất là khách vào lúc này
 * chỉ gặp thông báo bảo trì. Định nghĩa ngay trong Layout để hai tệp khỏi phải
 * gọi vòng qua nhau.
 */
function MaintenanceBanner() {
	const { t } = useLang();
	const { config } = useSiteConfig();
	if (!config?.maintenanceBypass) return null;
	return <div className="notice warn">{t.maintenanceAdmin}</div>;
}

/** Chữ đầu đen, phần còn lại màu nhấn. Dùng chung cho cả khu quản trị. */
export function Wordmark({ title = "Tuân AI" }: { title?: string }) {
	const [first, ...rest] = title.split(" ");
	return (
		<>
			{first} <span>{rest.join(" ")}</span>
		</>
	);
}

/**
 * Bật tắt nền tối.
 *
 * Bảng màu tối vốn đã có, nhưng trước đây chỉ chạy theo cài đặt của máy: ai muốn
 * đọc nền sáng giữa đêm, hay nền tối trên một máy để chế độ sáng, đều không có
 * đường nào. Một nút, hai trạng thái — biểu tượng cho thấy thứ sẽ nhận được khi
 * bấm, chứ không phải thứ đang xem.
 */
export function ThemeToggle() {
	const { lang } = useLang();
	const { theme, toggle } = useTheme();
	const toDark = theme === "light";
	const label = toDark
		? lang === "vi"
			? "Chuyển sang nền tối"
			: "Switch to dark mode"
		: lang === "vi"
			? "Chuyển sang nền sáng"
			: "Switch to light mode";

	return (
		<button
			type="button"
			className="theme-toggle"
			onClick={toggle}
			title={label}
			aria-label={label}
		>
			{toDark ? <MoonIcon size={16} /> : <SunIcon size={16} />}
		</button>
	);
}

export function LangToggle() {
	const { lang, setLang } = useLang();
	return (
		<div className="lang-toggle" role="group" aria-label="Ngôn ngữ">
			<button
				type="button"
				aria-pressed={lang === "vi"}
				onClick={() => setLang("vi")}
			>
				VI
			</button>
			<button
				type="button"
				aria-pressed={lang === "en"}
				onClick={() => setLang("en")}
			>
				EN
			</button>
		</div>
	);
}
