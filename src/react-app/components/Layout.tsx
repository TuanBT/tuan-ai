import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { useLang } from "../lib/lang-context";
import { mine, subscribeMine } from "../lib/mine";
import { useSiteConfig } from "../lib/site-config";
import { ChannelLinksRow } from "./Channels";

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
					<Wordmark title={title} />
				</Link>
				<LangToggle />
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

			{children}

			<footer className="footer">
				<ChannelLinksRow channels={config?.channels} />
				<p>{t.footerBlurb}</p>
				<div className="footer-links">
					<Link to="/">{t.navSubmit}</Link>
					<Link to="/r">{t.navMine}</Link>
					<Link to="/admin">{t.navAdmin}</Link>
				</div>
			</footer>
		</div>
	);
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
