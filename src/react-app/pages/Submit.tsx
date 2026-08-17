import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Countdown } from "../components/Countdown";
import { CopyCode } from "../components/CopyCode";
import { CheckIcon, CloseIcon, TikTokMark, YouTubeMark } from "../components/icons";
import { Turnstile } from "../components/Turnstile";
import { ApiError, api, type GalleryItem } from "../lib/api";
import { compressImage, formatBytes, ImageError } from "../lib/compress";
import { readContact, saveContact } from "../lib/contact";
import { formatDate, isoStamp } from "../lib/datetime";
import { useLang } from "../lib/lang-context";
import { remember } from "../lib/mine";
import { useSiteConfig } from "../lib/site-config";
import { Layout } from "../components/Layout";
import { useImageViewer } from "../lib/image-viewer";

interface Picked {
	file: File;
	preview: string;
}

/**
 * Mã của cái kiểu mang nghĩa "tôi không tả, anh tự quyết".
 *
 * Trong kho nó là một hàng `styles` như mọi hàng khác, chủ trang sửa tên hay tắt
 * đi được trong /admin, nên tên nút vẫn lấy từ kho, chỉ riêng chỗ đứng của nó
 * trong biểu mẫu là do đây định. Chủ trang xoá hàng này thì lối thoát biến mất
 * và bước 2 quay về đúng những gì còn lại, không vỡ chỗ nào.
 */
const DELEGATE_STYLE = "surprise";

export function Submit() {
	const { lang, t } = useLang();
	const { config, failed, reload } = useSiteConfig();
	const [gallery, setGallery] = useState<GalleryItem[]>([]);
	const [picked, setPicked] = useState<Picked[]>([]);
	const [busy, setBusy] = useState(false);
	const [compressing, setCompressing] = useState(false);
	const [styles, setStyles] = useState<string[]>([]);
	const [description, setDescription] = useState("");
	// Tên và email của lần gửi trước, điền sẵn hộ. Đọc một lần lúc dựng form,
	// không phải trong useEffect: ô nhập không nên nhấp nháy từ rỗng sang có chữ
	// ngay trước mắt người đang gõ.
	const [remembered] = useState(readContact);
	const [nickname, setNickname] = useState(remembered.nickname);
	const [email, setEmail] = useState(remembered.email);
	const [consent, setConsent] = useState(false);
	const [token, setToken] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState<string | null>(null);
	const fileInput = useRef<HTMLInputElement>(null);
	const { view, viewer } = useImageViewer();
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

	const maxImages = config?.maxImages ?? 2;

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
			} catch (err) {
				// Ảnh nặng quá và ảnh không đọc được là hai chuyện, hai cách chữa.
				setError(err instanceof ImageError ? err.code : "image_read");
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

	/**
	 * Bật tắt lời phó mặc.
	 *
	 * Bật thì nó đứng một mình: phó mặc mà vẫn kèm kiểu là hai câu ngược nhau
	 * trong cùng một bài. Tắt thì trả về tay trắng; nút chỉ hiện khi người gửi
	 * chưa chọn gì, nên không có kiểu nào để mà trả lại.
	 */
	function toggleDelegate() {
		setStyles((current) => (current.includes(DELEGATE_STYLE) ? [] : [DELEGATE_STYLE]));
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
			// Chỉ nhớ khi máy chủ đã nhận: gửi hỏng thì email vừa gõ chưa chắc đúng
			// dạng, điền lại nó cho lần sau chỉ là chép lại cái sai.
			saveContact({ nickname, email });
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

	const errorText = error
		? (t.errors as Record<string, string>)[error] ?? t.errors.generic
		: null;

	if (done) {
		return (
			<Layout title={config.siteTitle}>
				<div className="panel">
					<span className="badge ok icon-badge">
						<CheckIcon size={13} />
					</span>
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

					{/* Không nhắc lại nút sang kênh ở đây: chân trang ngay bên dưới đã
					    có đúng hai nút đó, và hai lần cùng một lời mời trong một màn
					    hình ngắn thì lời mời nào cũng nhạt đi. */}
				</div>
			</Layout>
		);
	}

	// Ba lý do đóng form, mỗi lý do một lời giải thích riêng. "setup" là khi chưa
	// cấu hình chống bot, lỗi của chủ trang, nên nói cho tử tế thay vì để người
	// dùng điền xong cả form rồi mới ăn lỗi.
	const closed = {
		// Gần như không ai thấy nhánh này: bảo trì thì hàng rào đã thay cả trang từ
		// trước. Giữ lại để nếu sau này có đường nào lọt qua thì màn hình vẫn nói
		// đúng chuyện đang xảy ra, thay vì đổ cho "tạm ngưng".
		maintenance: {
			badge: t.maintenanceBadge,
			title: t.maintenanceTitle,
			body: t.maintenanceBody,
		},
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

	// Lời phó mặc tách khỏi hàng kiểu, nên bước 2 có ba phần rời nhau chứ không
	// còn một hàng chip trộn hai loại nghĩa.
	const delegateStyle = config.styles.find((s) => s.id === DELEGATE_STYLE);
	const pickableStyles = config.styles.filter((s) => s.id !== DELEGATE_STYLE);
	const delegated = styles.includes(DELEGATE_STYLE);
	// Chưa gõ chữ và chưa chọn kiểu nào: đúng lúc lối thoát có ích, và cũng đúng
	// lúc bật nó lên không xoá mất thứ gì của người gửi.
	const saidNothing = description.trim() === "" && styles.length === 0;

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
					<section className="step">
						<h2 className="step-head">
							<span className="step-num">1</span>
							{t.stepPhotos}
						</h2>
						<button
							type="button"
							className="drop"
							onClick={() => fileInput.current?.click()}
						>
							<span className="drop-title">
								{compressing ? t.compressing : t.pickImages}
							</span>
							<span className="drop-sub">{t.pickHint(maxImages)}</span>
							{/* Nhận cả HEIC: ảnh iPhone lưu ở dạng đó, và khi người dùng vào
							    lấy ảnh qua mục "Duyệt" (ứng dụng Tệp) thì iOS lọc theo đúng
							    danh sách này, thiếu HEIC là ảnh của họ mờ đi, bấm không
							    được. Lấy từ thư viện ảnh thì iOS tự đổi sang JPEG, mà kể cả
							    không đổi thì `compressImage` cũng xuất lại JPEG trước khi
							    gửi, nên máy chủ vẫn chỉ nhận ba định dạng cũ. */}
							<input
								ref={fileInput}
								type="file"
								accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
								multiple
								onChange={(e) => addFiles(e.target.files)}
							/>
						</button>

						{picked.length > 0 && (
							<div className="thumbs">
								{picked.map((item, index) => (
									<div className="thumb" key={item.preview}>
										{/* Ô vuông 100px không đủ để soi lại tấm ảnh vừa chọn có
										    đúng tấm mình định gửi không. Chạm vào là xem cả tấm. */}
										<button
											type="button"
											className="thumb-open"
											onClick={() =>
												view(
													picked.map((entry) => entry.preview),
													index,
												)
											}
											aria-label={t.viewerOpen}
										>
											<img src={item.preview} alt="" />
										</button>
										<span className="thumb-size">
											{formatBytes(item.file.size)}
										</span>
										<button
											type="button"
											className="thumb-remove"
											onClick={() => removeAt(index)}
											aria-label={lang === "vi" ? "Bỏ ảnh này" : "Remove photo"}
										>
											<CloseIcon size={14} />
										</button>
									</div>
								))}
							</div>
						)}

						{/* Luật nhận ảnh và lời khuyên chọn ảnh nói cùng một chuyện, nên
						    nằm cùng một chỗ: luật đứng trước, in đậm, ngay khi mở ra. */}
						<details className="more">
							<summary>{t.advisoryTitle}</summary>
							<p>
								<strong>{t.advisoryRule}</strong> {t.advisoryMore}
							</p>
						</details>
					</section>

					<section className="step">
						<h2 className="step-head">
							<span className="step-num">2</span>
							{t.stepIdea}
						</h2>
						{/* Chỉ nói về ô gõ chữ. Câu cũ ("chọn một kiểu, hoặc gõ vài chữ,
						    một trong hai là đủ") bày ra một bài toán chọn nhánh ngay đầu
						    bước, trong khi thực tế hai thứ đó không thay được cho nhau:
						    ai gõ xong rồi thì kiểu chỉ là nói thêm, ai chọn kiểu rồi thì
						    cũng chẳng vì thế mà hết muốn tả. */}
						<span className="hint">{t.stepIdeaHint}</span>

						<div className="field">
							<textarea
								// Nhãn chữ của ô này đã gộp vào tiêu đề bước, mà tiêu đề thì
								// không gắn được với ô nhập; nói tên ra đây cho trình đọc
								// màn hình, nếu không ô này thành ô trống không tên.
								aria-label={t.stepIdea}
								className="textarea"
								maxLength={500}
								placeholder={t.descPlaceholder}
								value={description}
								disabled={delegated}
								onChange={(e) => setDescription(e.target.value)}
							/>
							{/* Bộ đếm chỉ có nghĩa khi đã gõ; hiện sẵn "0/500" ở ô trống chỉ
							    là thêm một con số vào màn hình. */}
							{description.length > 0 && (
								<span className="counter">{description.length}/500</span>
							)}
							{/* Gợi ý và kiểu nằm chung trong một khối gấp: cả hai đều là
							    lựa chọn tuỳ ý, gom lại gọn hơn và giảm chữ trên màn hình
							    khi người gửi chưa cần. */}
							{((description.length === 0 && !delegated) || pickableStyles.length > 0) && (
								<details className="more">
									<summary>{t.ideasTitle}</summary>

									{description.length === 0 && !delegated && (
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
									)}

									{pickableStyles.length > 0 && (
										<div className={delegated ? "styles aside" : "styles"}>
											<span className="hint">{t.stylesLabel}</span>
											<div className="chips">
												{pickableStyles.map((style) => (
													<button
														key={style.id}
														type="button"
														className="chip"
														aria-pressed={styles.includes(style.id)}
														disabled={delegated}
														onClick={() => toggleStyle(style.id)}
													>
														{lang === "vi" ? style.label_vi : style.label_en}
													</button>
												))}
											</div>
										</div>
									)}
								</details>
							)}
						</div>

						{/* Lối thoát cuối bước, tách hẳn khỏi hàng kiểu.
						    "Để Tuân tự quyết" trước đây là một con chip đứng lẫn giữa "Miễn
						    sao thật vui" với "Nhẹ nhàng, dễ thương", nhưng nó không cùng
						    loại với chúng: hai cái kia tả clip, còn nó là lời phó mặc, ấn
						    xong thì cả ô chữ lẫn hàng kiểu đều thành vô nghĩa.

						    Nên nó xuống đây, sau một vạch ngăn, và chỉ hiện khi người gửi
						    chưa nói gì. Ai đã gõ hay đã chọn kiểu thì không cần lối thoát
						    nữa, mà giấu nó đi cũng là cách chắc chắn không bao giờ có
						    chuyện vừa tả vừa phó mặc. */}
						{delegateStyle && (saidNothing || delegated) && (
							<div className="delegate">
								<span className="hint">{t.delegateLead}</span>
								<button
									type="button"
									className="chip"
									aria-pressed={delegated}
									onClick={toggleDelegate}
								>
									{lang === "vi"
										? delegateStyle.label_vi
										: delegateStyle.label_en}
								</button>
							</div>
						)}
					</section>

					<section className="step">
						<h2 className="step-head">
							<span className="step-num">3</span>
							{t.stepYou}
						</h2>
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
					</section>
				</form>
			)}

			{gallery.length > 0 && (
				<section className="gallery">
					<div className="section-head">
						<h2>{t.galleryTitle}</h2>
						<span className="hint">{t.galleryHint}</span>
					</div>
					<div className="gallery-grid">
						{gallery.map((item, index) => (
							<div
								key={`${item.publishedTiktok ?? ""}${item.publishedYoutube ?? ""}-${index}`}
								className="gallery-item"
							>
								{item.thumb && <img src={item.thumb} alt="" loading="lazy" />}
								{/* Tên kèm ngày gửi: một cái tên có thể xuất hiện ở nhiều ô, và
								    ngày cho thấy thư viện vẫn đang chạy chứ không phải mấy tấm
								    cũ để đó. */}
								<span className="gallery-cap">
									<span className="gallery-name">{item.nickname}</span>
									<time
										className="gallery-date"
										dateTime={isoStamp(item.createdAt)}
									>
										{formatDate(item.createdAt, lang)}
									</time>
								</span>
								<span className="gallery-links">
									{item.publishedTiktok && (
										<a
											href={item.publishedTiktok}
											target="_blank"
											rel="noopener noreferrer"
											aria-label={`${item.nickname} – TikTok`}
										>
											<TikTokMark size={15} />
										</a>
									)}
									{item.publishedYoutube && (
										<a
											href={item.publishedYoutube}
											target="_blank"
											rel="noopener noreferrer"
											aria-label={`${item.nickname} – YouTube`}
										>
											<YouTubeMark size={15} />
										</a>
									)}
								</span>
							</div>
						))}
					</div>
				</section>
			)}

			{viewer}
		</Layout>
	);
}
