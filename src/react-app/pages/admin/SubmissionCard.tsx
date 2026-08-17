import { useEffect, useRef, useState } from "react";
import type { AdminStyle, AdminSubmission } from "../../lib/api";
import { formatBytes } from "../../lib/compress";
import { formatDateTime } from "../../lib/datetime";
import { api } from "../../lib/api";
import { styleNames } from "../../lib/styles";
import { relativeTime, STATUS_LABEL, STATUS_TONE } from "./shared";

/** Hai ô dán link, mỗi kênh một ô. Thêm kênh thứ ba thì thêm một dòng ở đây. */
const LINK_FIELDS = [
	["publishedTiktok", "Link TikTok"],
	["publishedYoutube", "Link YouTube"],
] as const;

/**
 * Ảnh chụp trạng thái bài trước cú bấm gần nhất, để hoàn tác trả lại đúng thứ
 * đã mất — kể cả hai link mà "Bỏ qua" xoá đi theo.
 */
export interface Snapshot {
	status: string;
	publishedTiktok: string | null;
	publishedYoutube: string | null;
}

interface Props {
	item: AdminSubmission;
	styles: AdminStyle[];
	/** Bộ lọc đang xem, để biết bài vừa đổi có còn thuộc danh sách này không. */
	filter: string;
	/** Trạng thái trước cú bấm trong phiên làm việc này; chưa bấm gì thì là null. */
	changed: Snapshot | null;
	onStatus: (item: AdminSubmission, status: string) => Promise<void>;
	onReason: (item: AdminSubmission, reason: string) => Promise<void>;
	onUrl: (
		item: AdminSubmission,
		field: "publishedTiktok" | "publishedYoutube",
		value: string,
	) => Promise<void>;
	onUndo: (item: AdminSubmission) => Promise<void>;
	onDismiss: (item: AdminSubmission) => void;
	onRemove: (item: AdminSubmission) => Promise<void>;
	onView: (urls: string[], index: number) => void;
}

export function SubmissionCard({
	item,
	styles,
	filter,
	changed,
	onStatus,
	onReason,
	onUrl,
	onUndo,
	onDismiss,
	onRemove,
	onView,
}: Props) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState<string | null>(null);

	// Bản nháp lý do nằm trong state chứ không phải `defaultValue` như trước.
	// Ô không kiểm soát thì không có cách nào biết người duyệt đang gõ dở, mà
	// đúng lúc gõ dở lại là lúc dễ mất chữ nhất.
	const [reason, setReason] = useState(item.rejectReason ?? "");
	const reasonRef = useRef<HTMLTextAreaElement>(null);
	const wantFocus = useRef(false);

	const reasonDirty = reason.trim() !== (item.rejectReason ?? "");

	// Máy chủ nhận lý do rồi thì bản nháp coi như xong; đồng bộ lại để nút "Lưu"
	// tắt đi và dòng "Chưa lưu" biến mất.
	useEffect(() => {
		setReason(item.rejectReason ?? "");
	}, [item.rejectReason]);

	/**
	 * Vừa bấm "Bỏ qua" thì con trỏ nhảy thẳng vào ô lý do.
	 *
	 * Đây là điều người duyệt định làm tiếp theo trong gần như mọi trường hợp,
	 * mà ô thì vừa mới xuất hiện nên chẳng ai để mắt tới nó. Phải chờ một vòng
	 * vẽ lại: lúc `onStatus` trả về thì ô còn chưa có trong trang.
	 */
	useEffect(() => {
		if (item.status === "rejected" && wantFocus.current) {
			wantFocus.current = false;
			reasonRef.current?.focus();
		}
	}, [item.status]);

	function flash(message: string) {
		setSaved(message);
		setTimeout(() => setSaved(null), 1800);
	}

	async function run(action: () => Promise<void>, done?: string) {
		if (busy) return;
		setBusy(true);
		setError(null);
		try {
			await action();
			if (done) flash(done);
		} catch {
			// Trước đây lỗi ở đây rơi im lặng vào console: con số bên bộ lọc đã nhích,
			// thẻ đã đổi màu, mà máy chủ thì chưa ghi gì cả.
			setError("Không lưu được. Bạn thử lại giúp mình nhé.");
		} finally {
			setBusy(false);
		}
	}

	async function pick(status: string) {
		if (item.status === status) return;
		// Đang gõ dở lý do mà bấm sang trạng thái khác thì chữ đó vẫn là ý của
		// người duyệt: cất trước rồi hẵng đổi.
		if (item.status === "rejected" && reasonDirty) {
			await run(() => onReason(item, reason.trim()));
		}
		wantFocus.current = status === "rejected";
		await run(() => onStatus(item, status));
	}

	async function saveReason() {
		if (!reasonDirty) return;
		await run(() => onReason(item, reason.trim()), "Đã lưu lý do.");
	}

	return (
		<article className={`card${changed ? " card-changed" : ""}`}>
			{item.imageUrls.length > 0 ? (
				<div className="card-imgs">
					{item.imageUrls.map((url, index) => (
						// Trước đây mỗi ảnh mở ra một tab trơ trọi, xem xong phải đóng tab
						// quay lại. Giờ phóng to ngay tại chỗ, lật qua lại được giữa các
						// ảnh của cùng một bài.
						<button
							key={url}
							type="button"
							onClick={() => onView(item.imageUrls, index)}
							aria-label="Xem ảnh lớn"
						>
							<img src={url} alt="" loading="lazy" />
						</button>
					))}
				</div>
			) : (
				<span className="hint">Ảnh đã hết hạn và bị xoá.</span>
			)}

			<div className="bundle-bar">
				<a className="chip" href={api.adminBundleUrl(item.code)} download>
					⬇ Tải gói
				</a>
			</div>

			<div className="card-head">
				<strong>{item.nickname}</strong>
				<span className={`badge ${STATUS_TONE[item.status] ?? ""}`}>
					{STATUS_LABEL[item.status] ?? item.status}
				</span>
			</div>

			<div className="card-meta">
				<span>{item.code}</span>
				<span title={formatDateTime(item.createdAt)}>
					{relativeTime(item.createdAt)}
				</span>
				<span>{formatBytes(item.bytes)}</span>
			</div>

			<p className="card-desc">{item.description}</p>

			{item.styles.length > 0 && (
				<div className="card-meta">
					<span>Kiểu: {styleNames(styles, item.styles, "vi").join(", ")}</span>
				</div>
			)}
			{item.email && (
				<div className="card-meta">
					<span>{item.email}</span>
				</div>
			)}

			<div className="card-actions">
				{Object.entries(STATUS_LABEL).map(([value, label]) => (
					<button
						key={value}
						type="button"
						aria-pressed={item.status === value}
						disabled={busy}
						onClick={() => pick(value)}
					>
						{label}
					</button>
				))}
			</div>

			{/* Dải hoàn tác sau mỗi cú đổi trạng thái.
			    Trước đây bấm là xong, không có đường lui: bấm nhầm "Bỏ qua" thì bài
			    mất luôn hai link đã dán, mà nếu đang lọc theo trạng thái thì thẻ biến
			    mất khỏi màn hình ngay lập tức — chưa kịp gõ lý do, cũng chẳng còn chỗ
			    nào để gõ. */}
			{changed && (
				<div className="card-moved">
					<span>
						Đã chuyển sang “{STATUS_LABEL[item.status] ?? item.status}”
						{filter && filter !== item.status && (
							<>
								{" "}
								nên không còn thuộc bộ lọc “
								{STATUS_LABEL[filter] ?? filter}”. Thẻ vẫn ở đây tới khi bạn tải
								lại danh sách
							</>
						)}
						.
					</span>
					<div className="card-moved-actions">
						<button
							type="button"
							className="linkish"
							disabled={busy}
							onClick={() => run(() => onUndo(item))}
						>
							Hoàn tác về “{STATUS_LABEL[changed.status] ?? changed.status}”
						</button>
						{filter && filter !== item.status && (
							<button
								type="button"
								className="linkish"
								onClick={() => onDismiss(item)}
							>
								Ẩn thẻ này
							</button>
						)}
					</div>
				</div>
			)}

			{/* Bài bỏ qua thì không có clip nào để dẫn tới, nên chỗ này đổi hẳn nội
			    dung: thay hai ô dán link là câu nói lại với người gửi. */}
			{item.status === "rejected" ? (
				<div className="field">
					<label className="link-field">
						<span>Lý do bỏ qua (người gửi sẽ đọc câu này)</span>
						<textarea
							ref={reasonRef}
							className="input reason-box"
							rows={2}
							maxLength={500}
							placeholder="Bỏ trống cũng được: người gửi sẽ thấy câu chung."
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							onBlur={saveReason}
							onKeyDown={(e) => {
								// Ctrl/⌘+Enter lưu tại chỗ: gõ xong không phải rời ô rồi mới
								// yên tâm là chữ đã vào.
								if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveReason();
							}}
						/>
					</label>
					<div className="field-foot">
						<button
							type="button"
							className="linkish"
							disabled={!reasonDirty || busy}
							onClick={saveReason}
						>
							Lưu lý do
						</button>
						{reasonDirty ? (
							<span className="hint" style={{ color: "var(--warn)" }}>
								Chưa lưu.
							</span>
						) : (
							saved && (
								<span className="hint" style={{ color: "var(--ok)" }}>
									{saved}
								</span>
							)
						)}
					</div>
				</div>
			) : (
				/* Một bài thường lên cả hai kênh. Trước đây chỉ có một ô chung, nên dán
				   link thứ hai là đè mất link thứ nhất. */
				<div className="field">
					{LINK_FIELDS.map(([field, label]) => (
						<label className="link-field" key={field}>
							<span>{label}</span>
							<input
								className="input"
								type="url"
								placeholder="https://…"
								defaultValue={item[field] ?? ""}
								onBlur={(e) =>
									run(() => onUrl(item, field, e.target.value), "Đã lưu link.")
								}
							/>
						</label>
					))}
					{saved && (
						<span className="hint" style={{ color: "var(--ok)" }}>
							{saved}
						</span>
					)}
					{/* Khu "Đã lên sóng" ngoài trang chủ lọc theo link, nên bài đánh dấu
					    xong mà quên dán link sẽ không bao giờ hiện ra. */}
					{item.status === "done" &&
						!item.publishedTiktok &&
						!item.publishedYoutube && (
							<span className="hint" style={{ color: "var(--warn)" }}>
								Chưa có link nào nên bài này không hiện ở khu “Đã lên sóng”.
							</span>
						)}
				</div>
			)}

			{error && <p className="card-error">{error}</p>}

			<div className="card-actions">
				<button
					type="button"
					className="danger"
					disabled={busy}
					onClick={() => run(() => onRemove(item))}
				>
					Xoá vĩnh viễn
				</button>
			</div>
		</article>
	);
}
