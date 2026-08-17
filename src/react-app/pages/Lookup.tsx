import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CloseIcon, TikTokMark, YouTubeMark } from "../components/icons";
import { CopyCode } from "../components/CopyCode";
import { Layout } from "../components/Layout";
import { ApiError, api, type Submission } from "../lib/api";
import { CODE_LENGTH, CODE_PREFIX, codeDigits, digitsOnly, fullCode } from "../lib/code";
import { forgetContact, hasContact } from "../lib/contact";
import { formatDate, formatDateTime, isoStamp } from "../lib/datetime";
import { useImageViewer } from "../lib/image-viewer";
import { useLang } from "../lib/lang-context";
import { forget, mine, remember, type MineEntry } from "../lib/mine";
import { useSiteConfig } from "../lib/site-config";
import { styleNames } from "../lib/styles";

const BADGE: Record<string, string> = {
	new: "",
	selected: "ok",
	done: "ok",
	rejected: "bad",
};

/** Chặng đang sáng trên thanh tiến trình: nhận → chọn → lên sóng. */
const STAGE: Record<string, number> = {
	new: 0,
	selected: 1,
	done: 2,
	rejected: -1,
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
	// Cấu hình đã nằm sẵn trong bộ nhớ từ lúc khung trang tải nó, nên đọc ở đây
	// không tốn thêm lượt gọi nào.
	const { config } = useSiteConfig();
	const [input, setInput] = useState(codeDigits(code ?? ""));
	const [result, setResult] = useState<Submission | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(Boolean(code));
	const [saved, setSaved] = useState<MineEntry[]>(() => mine());
	// Tên và email điền sẵn cho form cũng nằm trong máy này, nên nút "Xoá khỏi
	// máy này" phải dọn cả chúng — và phải hiện ra ngay cả khi chưa lưu mã nào,
	// nếu không thì có thứ đã lưu mà không có chỗ nào xoá.
	const [storedContact, setStoredContact] = useState(hasContact);
	const { view, viewer } = useImageViewer();

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

	return (
		<Layout>
			<div className="hero">
				<span className="eyebrow">{t.lookupBtn}</span>
				<h1>{t.lookupTitle}</h1>
				<p>{t.lookupLead}</p>
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
						// Không đặt `maxLength`: trình duyệt cắt chuỗi dán *trước* khi
						// `digitsOnly` kịp chạy, nên dán "TA-04829173" (11 ký tự) chỉ còn
						// "TA-12345" rồi rơi xuống năm chữ số — mã cụt, tra không ra. Cứ
						// nhận cả chuỗi rồi lọc: "TA-04829173" hay "TA 048 291 73" đều ra
						// đúng tám chữ số, và `digitsOnly` vẫn chặn gõ quá tay.
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
						<CopyCode code={result.code} compact />
						<span className={`badge ${BADGE[result.status] ?? ""}`}>
							{statusText[result.status]?.title ?? result.status}
						</span>
					</div>

					{/* "Đang chờ duyệt" một mình thì mơ hồ: chờ tới bao giờ, còn mấy
					    chặng nữa? Thanh này cho thấy bài đang ở đâu trên đường đi. */}
					{result.status !== "rejected" && (
						<ol className="track">
							{[t.stepReceived, t.stepPicked, t.stepLive].map((label, index) => (
								<li
									key={label}
									className={index <= STAGE[result.status] ? "on" : ""}
								>
									<span className="track-dot" aria-hidden="true" />
									{label}
								</li>
							))}
						</ol>
					)}

					<p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
						{statusText[result.status]?.body}
					</p>

					{/* Câu chung ở trên hợp với mọi bài, nên nó không trả lời được "vì
					    sao bài của tôi". Khi chủ trang có viết lý do thì để nguyên văn ở
					    đây; không viết thì trang giữ nguyên như trước. */}
					{result.status === "rejected" && result.rejectReason && (
						<div className="notice bad">
							<strong>{t.rejectReasonLabel}</strong>
							<span>{result.rejectReason}</span>
						</div>
					)}

					{/* Bài lên cả hai kênh thì hiện cả hai nút: người xem quen TikTok hay
					    quen YouTube là chuyện của họ, đừng chọn hộ. */}
					{(result.publishedTiktok || result.publishedYoutube) && (
						<div className="field">
							<span className="hint">{t.watchNow}</span>
							<div className="watch-row">
								{result.publishedTiktok && (
									<a
										className="cta watch"
										href={result.publishedTiktok}
										target="_blank"
										rel="noopener noreferrer"
									>
										<TikTokMark />
										TikTok
									</a>
								)}
								{result.publishedYoutube && (
									<a
										className="cta watch"
										href={result.publishedYoutube}
										target="_blank"
										rel="noopener noreferrer"
									>
										<YouTubeMark />
										YouTube
									</a>
								)}
							</div>
						</div>
					)}

					{/* Chỗ duy nhất câu này có nghĩa thật. Trên trang gửi bài nó là một
					    dòng chữ nữa phải đọc trước khi được bấm gửi; ở đây nó trả lời
					    đúng câu người tra mã sắp hỏi: ảnh của tôi còn tới bao giờ, và
					    lát nữa quay lại thì còn thấy gì. */}
					{result.imageUrls.length > 0 ? (
						<>
							<div className="thumbs">
								{result.imageUrls.map((url, index) => (
									<div className="thumb" key={url}>
										{/* Người vào đây là để nhìn lại ảnh mình đã gửi, nên ô
										    vuông nhỏ phải mở ra được thành cả tấm. */}
										<button
											type="button"
											className="thumb-open"
											onClick={() => view(result.imageUrls, index)}
											aria-label={t.viewerOpen}
										>
											<img src={url} alt="" />
										</button>
									</div>
								))}
							</div>
							{config && (
								<span className="hint">
									{t.retentionNote(config.retentionDays)}
								</span>
							)}
						</>
					) : (
						<span className="hint">{t.imagesGone}</span>
					)}

					<dl>
						<dt>{lang === "vi" ? "Tên hiển thị" : "Display name"}</dt>
						<dd>{result.nickname}</dd>
					</dl>

					{/* Kiểu đã chọn trước đây không hiện ở đâu cả, nên ai chỉ chạm một
					    kiểu rồi gửi (không gõ chữ nào) mở bài ra chỉ thấy mỗi cái tên:
					    trang không nhắc lại được chính thứ họ đã chọn. */}
					{result.styles.length > 0 && (
						<dl>
							<dt>{lang === "vi" ? "Kiểu đã chọn" : "Style picked"}</dt>
							<dd className="tag-row">
								{styleNames(config?.styles, result.styles, lang).map((name) => (
									<span className="tag" key={name}>
										{name}
									</span>
								))}
							</dd>
						</dl>
					)}

					{result.description && (
						<dl>
							<dt>{lang === "vi" ? "Mô tả" : "Description"}</dt>
							<dd>{result.description}</dd>
						</dl>
					)}

					<dl>
						<dt>{lang === "vi" ? "Ngày gửi" : "Sent on"}</dt>
						<dd>
							<time dateTime={isoStamp(result.createdAt)}>
								{formatDateTime(result.createdAt, lang)}
							</time>
						</dd>
					</dl>
				</div>
			)}

			{/* Không có tài khoản, nên mất mã là mất bài. Danh sách này là đường
			    quay lại, và nó nằm trọn trong máy của người dùng. Khi rỗng vẫn hiện
			    khung: người vừa bấm "Bài của tôi" cần biết mình đang ở đúng chỗ,
			    chứ không phải nhìn một trang trắng. */}
			<section className="mine">
				<div className="mine-head">
					<h2>{t.mineTitle}</h2>
					{(saved.length > 0 || storedContact) && (
						<button
							type="button"
							className="linkish"
							onClick={() => {
								if (!confirm(t.mineConfirm)) return;
								forget();
								forgetContact();
								setSaved([]);
								setStoredContact(false);
							}}
						>
							{t.mineForgetAll}
						</button>
					)}
				</div>

				{saved.length === 0 ? (
					<div className="empty">
						<p>{t.mineEmpty}</p>
						<Link className="cta-ghost" to="/">
							{t.navSubmit}
						</Link>
					</div>
				) : (
					<>
						<div className="rows">
							{saved.map((entry) => (
								<div className="row" key={entry.code}>
									<Link className="mine-link" to={`/r/${entry.code}`}>
										<strong>{entry.code}</strong>
										<small>
											{entry.nickname} · {formatDate(entry.at, lang)}
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
										<CloseIcon size={14} />
									</button>
								</div>
							))}
						</div>

						<p className="hint">{t.mineHint}</p>
					</>
				)}
			</section>

			{viewer}
		</Layout>
	);
}
