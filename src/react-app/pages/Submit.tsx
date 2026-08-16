import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Countdown } from "../components/Countdown";
import { Turnstile } from "../components/Turnstile";
import { ApiError, api, type GalleryItem, type SiteConfig } from "../lib/api";
import { compressImage, formatBytes } from "../lib/compress";
import { useLang } from "../lib/lang-context";
import { Layout } from "../components/Layout";

interface Picked {
	file: File;
	preview: string;
}

export function Submit() {
	const { lang, t } = useLang();
	const [config, setConfig] = useState<SiteConfig | null>(null);
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

	useEffect(() => {
		api.config().then(setConfig).catch(() => setError("network"));
		api.gallery().then((data) => setGallery(data.items)).catch(() => {});
	}, []);

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
			setDone(result.code);
			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (err) {
			const code = err instanceof ApiError ? err.code : "generic";
			setError(code);
			if (code === "quota") {
				api.config().then(setConfig).catch(() => {});
			}
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
					<div className="code-box">{done}</div>
					<p>{t.successBody}</p>
					<Link className="cta" to={`/r/${done}`} style={{ marginTop: 6 }}>
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
			</Layout>
		);
	}

	const canSubmit =
		picked.length > 0 &&
		nickname.trim().length > 0 &&
		description.trim().length > 0 &&
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

			{!config.open ? (
				<div className="panel">
					<span className="badge warn">
						{config.closedReason === "paused" ? "Tạm ngưng" : "Tạm đầy"}
					</span>
					<h2>
						{config.closedReason === "paused" ? t.closedPaused : t.closedQuota}
					</h2>
					{config.closedReason === "quota" && (
						<>
							<span className="hint">{t.backIn}</span>
							<Countdown seconds={config.resetInSeconds} />
						</>
					)}
					<p>
						{config.closedReason === "paused"
							? t.closedPausedBody
							: t.closedQuotaBody}
					</p>
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
						<textarea
							id="desc"
							className="textarea"
							maxLength={500}
							placeholder={t.descPlaceholder}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
						<span className="counter">{description.length}/500</span>
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

					<Turnstile siteKey={config.turnstileSiteKey} onToken={setToken} />

					{errorText && <div className="error">{errorText}</div>}

					<button className="cta" type="submit" disabled={!canSubmit}>
						{busy ? t.sending : t.submit}
					</button>
				</form>
			)}

			{gallery.length > 0 && (
				<section className="gallery">
					<h2>{t.galleryTitle}</h2>
					<div className="gallery-grid">
						{gallery.map((item) => (
							<a
								key={item.code}
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
