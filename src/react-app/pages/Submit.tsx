import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Countdown } from "../components/Countdown";
import { CopyCode } from "../components/CopyCode";
import { Turnstile } from "../components/Turnstile";
import { ApiError, api, type GalleryItem } from "../lib/api";
import { compressImage, formatBytes } from "../lib/compress";
import { useLang } from "../lib/lang-context";
import { remember } from "../lib/mine";
import { useSiteConfig } from "../lib/site-config";
import { ChannelLinksRow } from "../components/Channels";
import { Layout } from "../components/Layout";

interface Picked {
	file: File;
	preview: string;
}

export function Submit() {
	const { lang, t } = useLang();
	const { config, failed, reload } = useSiteConfig();
	const [gallery, setGallery] = useState<GalleryItem[]>([]);
	const [picked, setPicked] = useState<Picked[]>([]);
	const [busy, setBusy] = useState(false);
	const [compressing, setCompressing] = useState(false);
	const [styles, setStyles] = useState<string[]>([]);
	const [description, setDescription] = useState("");
	const [nickname, setNickname] = useState("");
	const [email, setEmail] = useState("");
	const [consent, setConsent] = useState(false);
	const [token, setToken] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState<string | null>(null);
	const fileInput = useRef<HTMLInputElement>(null);
	// Chọn ngẫu nhiên một lần mỗi lượt vào trang: người quay lại lần sau thấy ý
	// khác, thay vì tưởng trang chỉ làm được đúng ba thứ đó.
	const [ideaPicks] = useState(() =>
		[0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, 3),
	);

	useEffect(() => {
		api.gallery().then((data) => setGallery(data.items)).catch(() => {});
	}, []);

	useEffect(() => {
		if (failed) setError("network");
	}, [failed]);

	// Ảnh xem trước giữ trong bộ nhớ trình duyệt; thu hồi khi rời trang.
	useEffect(() => {
		return () => picked.forEach((item) => URL.revokeObjectURL(item.preview));
	}, [picked]);

	const maxImages = config?.maxImages ?? 3;

	async function addFiles(list: FileList | null) {
		if (!list?.length) return;
		setError(null);
		setCompressing(true);

		const room = maxImages - picked.length;
		const incoming: Picked[] = [];

		for (const file of Array.from(list).slice(0, Math.max(0, room))) {
			try {
				const compressed = await compressImage(file);
				incoming.push({
					file: compressed,
					preview: URL.createObjectURL(compressed),
				});
			} catch {
				setError("image_size");
			}
		}

		setPicked((current) => [...current, ...incoming].slice(0, maxImages));
		setCompressing(false);
		if (fileInput.current) fileInput.current.value = "";
	}

	function removeAt(index: number) {
		setPicked((current) => {
			URL.revokeObjectURL(current[index].preview);
			return current.filter((_, i) => i !== index);
		});
	}

	function toggleStyle(id: string) {
		setStyles((current) =>
			current.includes(id)
				? current.filter((entry) => entry !== id)
				: [...current, id],
		);
	}

	async function send(event: React.FormEvent) {
		event.preventDefault();
		if (busy) return;

		setError(null);
		setBusy(true);

		const form = new FormData();
		for (const item of picked) form.append("images", item.file);
		form.append("nickname", nickname);
		form.append("description", description);
		form.append("email", email);
		form.append("styles", JSON.stringify(styles));
		form.append("lang", lang);
		if (token) form.append("turnstile", token);

		try {
			const result = await api.submit(form);
			// Mã là chìa khoá duy nhất để quay lại bài này, nhớ hộ người dùng ngay
			// trên máy họ, phòng khi họ đóng tab trước lúc kịp chép mã.
			remember(result.code, nickname.trim());
			setDone(result.code);
			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (err) {
			const code = err instanceof ApiError ? err.code : "generic";
			setError(code);
			// Hết hạn mức thì cấu hình vừa đổi ngay lúc này, lấy bản mới để trang
			// chuyển sang màn hình "tạm đầy" thay vì mời gửi tiếp rồi lại báo lỗi.
			if (code === "quota") reload();
		} finally {
			setBusy(false);
		}
	}

	if (!config) {
		return (
			<Layout>
				<div className="center">
					<div className="spinner" role="status" aria-label="Đang tải" />
				</div>
			</Layout>
		);
	}

	const tagline = config.tagline[lang];
	const errorText = error
		? (t.errors as Record<string, string>)[error] ?? t.errors.generic
		: null;

	if (done) {
		return (
			<Layout title={config.siteTitle}>
				<div className="panel">
					<span className="badge ok">✓</span>
					<h2>{t.successTitle}</h2>
					<span className="hint">{t.yourCode}</span>
					<CopyCode code={done} />
					<p>{t.successBody}</p>
					<div className="panel-actions">
						<Link className="cta" to={`/r/${done}`}>
							{t.viewStatus}
						</Link>
						<button
							type="button"
							className="cta-ghost"
							onClick={() => window.location.reload()}
						>
							{t.another}
						</button>
					</div>

					{/* Chờ duyệt mất vài ngày. Mời họ xem kênh ngay lúc đang hào hứng
					    nhất, thay vì để trang thành ngõ cụt. */}
					<ChannelLinksRow channels={config.channels} tone="loud" />
				</div>
			</Layout>
		);
	}

	// Ba lý do đóng form, mỗi lý do một lời giải thích riêng. "setup" là khi chưa
	// cấu hình chống bot, lỗi của chủ trang, nên nói cho tử tế thay vì để người
	// dùng điền xong cả form rồi mới ăn lỗi.
	const closed = {
		paused: {
			badge: lang === "vi" ? "Tạm ngưng" : "Paused",
			title: t.closedPaused,
			body: t.closedPausedBody,
		},
		quota: {
			badge: lang === "vi" ? "Tạm đầy" : "Full",
			title: t.closedQuota,
			body: t.closedQuotaBody,
		},
		setup: {
			badge: lang === "vi" ? "Đang cài đặt" : "Setting up",
			title: t.closedSetup,
			body: t.closedSetupBody,
		},
	}[config.closedReason ?? "paused"];

	// Mô tả hoặc kiểu: có một trong hai là đủ. Ai chỉ có tấm ảnh thì chạm
	// "Để Tuân tự quyết" là gửi được, không phải nặn ra cho đủ chữ.
	const canSubmit =
		picked.length > 0 &&
		nickname.trim().length > 0 &&
		(description.trim().length > 0 || styles.length > 0) &&
		consent &&
		!busy &&
		!compressing &&
		(!config.turnstileSiteKey || token);

	return (
		<Layout title={config.siteTitle}>
			<div className="hero">
				<span className="eyebrow">{t.submitEyebrow}</span>
				<h1>{tagline}</h1>
			</div>

			{/* Người đến từ TikTok chưa biết trang này là gì và mất bao lâu mới có
			    kết quả. Ba ô này trả lời trước khi họ phải hỏi. */}
			<ol className="steps" aria-label={t.howTitle}>
				{t.steps.map((step, index) => (
					<li key={step.title}>
						<span className="steps-num">{index + 1}</span>
						<strong>{step.title}</strong>
						<small>{step.body}</small>
					</li>
				))}
			</ol>

			{!config.open ? (
				<div className="panel">
					<span className="badge warn">{closed.badge}</span>
					<h2>{closed.title}</h2>
					{config.closedReason === "quota" && (
						<>
							<span className="hint">{t.backIn}</span>
							<Countdown seconds={config.resetInSeconds} />
						</>
					)}
					<p>{closed.body}</p>
				</div>
			) : (
				<form className="form" onSubmit={send}>
					<div className="field">
						<button
							type="button"
							className="drop"
							onClick={() => fileInput.current?.click()}
						>
							<span className="drop-title">
								{compressing ? t.compressing : t.pickImages}
							</span>
							<span className="drop-sub">{t.pickHint(maxImages)}</span>
							<input
								ref={fileInput}
								type="file"
								accept="image/jpeg,image/png,image/webp"
								multiple
								onChange={(e) => addFiles(e.target.files)}
							/>
						</button>

						{picked.length > 0 && (
							<div className="thumbs">
								{picked.map((item, index) => (
									<div className="thumb" key={item.preview}>
										<img src={item.preview} alt="" />
										<span className="thumb-size">
											{formatBytes(item.file.size)}
										</span>
										<button
											type="button"
											className="thumb-remove"
											onClick={() => removeAt(index)}
											aria-label="Bỏ ảnh này"
										>
											×
										</button>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="advisory">
						<span className="advisory-bar" />
						<span>{t.advisory}</span>
					</div>

					{config.styles.length > 0 && (
						<div className="field">
							<span className="label">{t.styleLabel}</span>
							<span className="hint">{t.styleHint}</span>
							<div className="chips">
								{config.styles.map((style) => (
									<button
										key={style.id}
										type="button"
										className="chip"
										aria-pressed={styles.includes(style.id)}
										onClick={() => toggleStyle(style.id)}
									>
										{lang === "vi" ? style.label_vi : style.label_en}
									</button>
								))}
							</div>
						</div>
					)}

					<div className="field">
						<label className="label" htmlFor="desc">
							{t.descLabel}
						</label>
						{/* Chỉ nói "để trống cũng được" khi điều đó đúng. Hiện lúc chưa
						    chọn kiểu nào thì thành lời khuyên sai, gửi sẽ không đi. */}
						{styles.length > 0 && (
							<span className="hint">{t.descOptional}</span>
						)}
						<textarea
							id="desc"
							className="textarea"
							maxLength={500}
							placeholder={t.descPlaceholder}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
						<span className="counter">{description.length}/500</span>

						{/* Ô trống là chỗ nhiều người bỏ cuộc. Gợi ý chỉ hiện khi chưa
						    gõ gì, và biến mất ngay khi họ bắt đầu, chạm vào không bao
						    giờ đè lên chữ của người dùng. */}
						{description.length === 0 && (
							<div className="ideas">
								<span className="hint">{t.ideasLabel}</span>
								<div className="chips">
									{ideaPicks
										.filter((index) => index < t.ideas.length)
										.map((index) => (
											<button
												key={index}
												type="button"
												className="chip idea"
												onClick={() => setDescription(t.ideas[index])}
											>
												{t.ideas[index]}
											</button>
										))}
								</div>
							</div>
						)}
					</div>

					<div className="field">
						<input
							className="input"
							maxLength={60}
							placeholder={t.nickname}
							value={nickname}
							onChange={(e) => setNickname(e.target.value)}
						/>
						<input
							className="input"
							type="email"
							maxLength={120}
							placeholder={t.email}
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
						<span className="hint">{t.emailHint}</span>
					</div>

					<label className="consent">
						<input
							type="checkbox"
							checked={consent}
							onChange={(e) => setConsent(e.target.checked)}
						/>
						<span>{t.consent}</span>
					</label>

					{/* Nói thẳng thời hạn giữ ảnh ngay chỗ người ta quyết định gửi hay
					    không, thay vì giấu trong một trang điều khoản không ai đọc. */}
					<span className="hint">{t.retentionNote(config.retentionDays)}</span>

					<Turnstile siteKey={config.turnstileSiteKey} onToken={setToken} />

					{errorText && <div className="error">{errorText}</div>}

					<button className="cta" type="submit" disabled={!canSubmit}>
						{busy ? t.sending : t.submit}
					</button>
				</form>
			)}

			{gallery.length > 0 && (
				<section className="gallery">
					<div className="section-head">
						<h2>{t.galleryTitle}</h2>
						<span className="hint">{t.galleryHint}</span>
					</div>
					<div className="gallery-grid">
						{gallery.map((item) => (
							<a
								key={item.publishedUrl}
								className="gallery-item"
								href={item.publishedUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								{item.thumb && <img src={item.thumb} alt="" loading="lazy" />}
								<span className="gallery-name">{item.nickname}</span>
							</a>
						))}
					</div>
				</section>
			)}
		</Layout>
	);
}
