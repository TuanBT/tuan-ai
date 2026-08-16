import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ApiError, api, type Submission } from "../lib/api";
import { useLang } from "../lib/lang-context";

const BADGE: Record<string, string> = {
	new: "",
	selected: "ok",
	done: "ok",
	rejected: "bad",
};

/**
 * Gắn `key` theo mã tra cứu để khi người dùng tra mã khác thì component dựng
 * lại từ đầu. Nhờ vậy trạng thái tự đặt lại, không cần đồng bộ thủ công.
 */
export function Lookup() {
	const { code } = useParams<{ code: string }>();
	return <LookupView key={code ?? ""} code={code} />;
}

function LookupView({ code }: { code: string | undefined }) {
	const navigate = useNavigate();
	const { lang, t } = useLang();
	const [input, setInput] = useState(code ?? "");
	const [result, setResult] = useState<Submission | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(Boolean(code));

	useEffect(() => {
		if (!code) return;
		let cancelled = false;

		api
			.lookup(code.toUpperCase())
			.then((data) => {
				if (cancelled) return;
				setResult(data);
				setBusy(false);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(err instanceof ApiError ? err.code : "generic");
				setBusy(false);
			});

		return () => {
			cancelled = true;
		};
	}, [code]);

	const statusText: Record<string, { title: string; body: string }> = {
		new: { title: t.statusNew, body: t.statusNewBody },
		selected: { title: t.statusSelected, body: t.statusSelectedBody },
		done: { title: t.statusDone, body: t.statusDoneBody },
		rejected: { title: t.statusRejected, body: t.statusRejectedBody },
	};

	return (
		<Layout>
			<div className="hero">
				<span className="eyebrow">{t.lookupBtn}</span>
				<h1>{t.lookupTitle}</h1>
			</div>

			<form
				className="lookup-row"
				onSubmit={(e) => {
					e.preventDefault();
					// Người dùng hay chỉ gõ phần số, hoặc chép cả dấu cách; nhận hết.
					const digits = input.replace(/\D/g, "");
					const clean =
						digits.length === 8 ? `TA-${digits}` : input.trim().toUpperCase();
					if (clean) navigate(`/r/${clean}`);
				}}
			>
				<input
					className="input"
					inputMode="numeric"
					placeholder={t.lookupPlaceholder}
					value={input}
					maxLength={11}
					onChange={(e) => setInput(e.target.value)}
				/>
				<button className="cta" type="submit">
					{t.lookupBtn}
				</button>
			</form>

			{busy && (
				<div className="center">
					<div className="spinner" role="status" />
				</div>
			)}

			{error && (
				<div className="error">
					{error === "too_many_lookups" ? t.tooManyLookups : t.notFound}
				</div>
			)}

			{result && !busy && (
				<div className="detail">
					<div className="detail-head">
						<span className="detail-code">{result.code}</span>
						<span className={`badge ${BADGE[result.status] ?? ""}`}>
							{statusText[result.status]?.title ?? result.status}
						</span>
					</div>

					<p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
						{statusText[result.status]?.body}
					</p>

					{result.publishedUrl && (
						<a
							className="cta"
							href={result.publishedUrl}
							target="_blank"
							rel="noopener noreferrer"
							style={{ textAlign: "center", textDecoration: "none" }}
						>
							{t.watchNow}
						</a>
					)}

					{result.imageUrls.length > 0 ? (
						<div className="thumbs">
							{result.imageUrls.map((url) => (
								<div className="thumb" key={url}>
									<img src={url} alt="" />
								</div>
							))}
						</div>
					) : (
						<span className="hint">{t.imagesGone}</span>
					)}

					<dl>
						<dt>{lang === "vi" ? "Tên hiển thị" : "Display name"}</dt>
						<dd>{result.nickname}</dd>
					</dl>
					<dl>
						<dt>{lang === "vi" ? "Mô tả" : "Description"}</dt>
						<dd>{result.description}</dd>
					</dl>
					<dl>
						<dt>{lang === "vi" ? "Ngày gửi" : "Sent on"}</dt>
						<dd>
							{new Date(result.createdAt).toLocaleDateString(
								lang === "vi" ? "vi-VN" : "en-GB",
							)}
						</dd>
					</dl>
				</div>
			)}
		</Layout>
	);
}
