import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../lib/lang-context";

export function Layout({
	children,
	title = "Tuân AI",
}: {
	children: ReactNode;
	title?: string;
}) {
	const { lang, setLang } = useLang();
	const [first, ...rest] = title.split(" ");

	return (
		<div className="page">
			<header className="topbar">
				<Link className="wordmark" to="/">
					{first} <span>{rest.join(" ")}</span>
				</Link>
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
			</header>

			{children}

			<footer className="footer">
				<Link to="/r">
					{lang === "vi" ? "Tra cứu bài của bạn" : "Check your submission"}
				</Link>
				<Link to="/admin">{lang === "vi" ? "Quản trị" : "Admin"}</Link>
			</footer>
		</div>
	);
}
