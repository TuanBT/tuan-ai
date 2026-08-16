import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ApiError, api, type Submission } from "../lib/api";
import { CODE_LENGTH, CODE_PREFIX, codeDigits, digitsOnly, fullCode } from "../lib/code";
import { useLang } from "../lib/lang-context";
import { forget, mine, remember, type MineEntry } from "../lib/mine";

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
	const [input, setInput] = useState(codeDigits(code ?? ""));
	const [result, setResult] = useState<Submission | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(Boolean(code));
	const [saved, setSaved] = useState<MineEntry[]>(() => mine());

	useEffect(() => {
		if (!code) return;
		let cancelled = false;

		api
			.lookup(code.toUpperCase())
			.then((data) => {
				if (cancelled) return;
				setResult(data);
				setBusy(false);
				// Nhớ luôn cả những mã tra bằng tay: mở link ở máy khác thì máy đó
				// cũng có đường quay lại, không phải gõ mã thêm lần nữa.
				remember(data.code, data.nickname);
				setSaved(mine());
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

	const locale = lang === "vi" ? "vi-VN" : "en-GB";

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
					if (input.length === CODE_LENGTH) navigate(`/r/${fullCode(input)}`);
				}}
			>
				{/* Tiền tố gắn cố định trong ô: người dùng nhìn thấy mã thật là
				    TA-xxxxxxxx nhưng chỉ phải gõ tám chữ số. */}
				<div className="code-field">
					<span className="code-field-prefix" aria-hidden="true">
						{CODE_PREFIX}
					</span>
					<input
						inputMode="numeric"
						autoComplete="off"
						aria-label={t.lookupPlaceholder}
						placeholder={t.lookupPlaceholder}
						value={input}
						maxLength={CODE_LENGTH}
						// Dán cả "TA-04829173" hay "TA 048 291 73" đều ra đúng tám chữ số.
						onChange={(e) => setInput(digitsOnly(e.target.value))}
					/>
				</div>
				<button
					className="cta"
					type="submit"
					disabled={input.length !== CODE_LENGTH}
				>
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
						<dd>{new Date(result.createdAt).toLocaleDateString(locale)}</dd>
					</dl>
				</div>
			)}

			{/* Không có tài khoản, nên mất mã là mất bài. Danh sách này là đường
			    quay lại, và nó nằm trọn trong máy của người dùng. */}
			{saved.length > 0 && (
				<section className="mine">
					<div className="mine-head">
						<h2>{t.mineTitle}</h2>
						<button
							type="button"
							className="linkish"
							onClick={() => {
								if (!confirm(t.mineConfirm)) return;
								forget();
								setSaved([]);
							}}
						>
							{t.mineForgetAll}
						</button>
					</div>

					<div className="rows">
						{saved.map((entry) => (
							<div className="row" key={entry.code}>
								<Link className="mine-link" to={`/r/${entry.code}`}>
									<strong>{entry.code}</strong>
									<small>
										{entry.nickname} ·{" "}
										{new Date(entry.at).toLocaleDateString(locale)}
									</small>
								</Link>
								<button
									type="button"
									className="chip"
									title={t.mineForgetOne}
									aria-label={`${t.mineForgetOne} ${entry.code}`}
									onClick={() => {
										forget(entry.code);
										setSaved(mine());
									}}
								>
									×
								</button>
							</div>
						))}
					</div>

					<p className="hint">{t.mineHint}</p>
				</section>
			)}
		</Layout>
	);
}
