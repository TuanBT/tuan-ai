import { useCallback, useEffect, useState } from "react";
import { api, INBOX_PAGE, type AdminStyle, type AdminSubmission } from "../../lib/api";
import { formatBytes } from "../../lib/compress";
import { useImageViewer } from "../../lib/image-viewer";
import { styleNames } from "../../lib/styles";
import { BUNDLE_LIMIT, relativeTime, STATUS_LABEL, STATUS_TONE } from "./shared";

/** Hai ô dán link, mỗi kênh một ô. Thêm kênh thứ ba thì thêm một dòng ở đây. */
const LINK_FIELDS = [
	["publishedTiktok", "Link TikTok"],
	["publishedYoutube", "Link YouTube"],
] as const;

export function Inbox() {
	const [items, setItems] = useState<AdminSubmission[]>([]);
	const [counts, setCounts] = useState<Record<string, number>>({});
	const [filter, setFilter] = useState("");
	const [search, setSearch] = useState("");
	const [query, setQuery] = useState("");
	const [busy, setBusy] = useState(true);
	const [more, setMore] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [savedUrl, setSavedUrl] = useState<string | null>(null);
	const [styles, setStyles] = useState<AdminStyle[]>([]);
	const { view, viewer } = useImageViewer();

	// Bảng tên kiểu đọc một lần cho cả hộp thư: bài chỉ lưu mã kiểu, mà mã thì
	// không nói được người gửi đã chọn gì.
	useEffect(() => {
		api.adminStyles().then((data) => setStyles(data.items)).catch(() => {});
	}, []);

	// Tìm kiếm chạy trên máy chủ để với tới cả bài cũ, nên phải chờ người dùng gõ
	// xong. Bắn một lượt mỗi phím thì vừa tốn truy vấn vừa nhấp nháy kết quả.
	useEffect(() => {
		const id = setTimeout(() => setQuery(search.trim()), 300);
		return () => clearTimeout(id);
	}, [search]);

	const load = useCallback(async () => {
		setBusy(true);
		try {
			const data = await api.adminList(filter, query);
			setItems(data.items);
			setCounts(data.counts);
			setMore(data.items.length === INBOX_PAGE);
		} finally {
			setBusy(false);
		}
	}, [filter, query]);

	useEffect(() => {
		load();
	}, [load]);

	/**
	 * Lấy tiếp đợt sau, tính từ bài cũ nhất đang hiện.
	 *
	 * Con trỏ là mốc thời gian chứ không phải số thứ tự trang: người duyệt vừa
	 * lướt vừa đổi trạng thái bài, mà đánh số trang thì mỗi lần thứ tự xê dịch là
	 * một bài bị nhảy qua hoặc hiện hai lần.
	 */
	async function loadMore() {
		const last = items[items.length - 1];
		if (!last || loadingMore) return;

		setLoadingMore(true);
		try {
			const data = await api.adminList(filter, query, last.createdAt);
			setItems((current) => [...current, ...data.items]);
			setMore(data.items.length === INBOX_PAGE);
		} finally {
			setLoadingMore(false);
		}
	}

	/**
	 * Sửa ngay trên danh sách đang có thay vì tải lại cả hộp thư.
	 *
	 * Tải lại thì mọi đợt "tải thêm" đã bấm đều bị cuốn về đợt đầu, nên người
	 * duyệt đang làm dở ở bài thứ sáu mươi bị ném về đầu danh sách sau mỗi cú bấm.
	 */
	function patchLocal(code: string, patch: Partial<AdminSubmission>) {
		setItems((current) =>
			current.map((entry) =>
				entry.code === code ? { ...entry, ...patch } : entry,
			),
		);
	}

	function shiftCount(from: string | null, to: string | null) {
		setCounts((current) => {
			const next = { ...current };
			if (from) next[from] = Math.max(0, (next[from] ?? 1) - 1);
			if (to) next[to] = (next[to] ?? 0) + 1;
			return next;
		});
	}

	async function setStatus(item: AdminSubmission, status: string) {
		if (item.status === status) return;
		await api.adminPatch(item.code, { status });
		shiftCount(item.status, status);

		// Đang lọc theo một trạng thái mà bài vừa đổi sang trạng thái khác thì nó
		// không còn thuộc danh sách này nữa: cho khuất đi, đúng như trước đây.
		if (filter && filter !== status) {
			setItems((current) =>
				current.filter((entry) => entry.code !== item.code),
			);
		} else {
			patchLocal(item.code, { status });
		}
	}

	async function saveUrl(
		item: AdminSubmission,
		field: "publishedTiktok" | "publishedYoutube",
		value: string,
	) {
		if (value === (item[field] ?? "")) return;
		await api.adminPatch(item.code, { [field]: value });
		patchLocal(item.code, { [field]: value || null });
		// Lưu lúc rời ô là im lặng: không có dấu hiệu này thì không ai biết link
		// đã vào hay mình vừa gõ vào chỗ trống.
		setSavedUrl(item.code);
		setTimeout(() => setSavedUrl(null), 1800);
	}

	async function remove(item: AdminSubmission) {
		if (!confirm(`Xoá vĩnh viễn bài ${item.code}? Ảnh sẽ bị xoá khỏi kho luôn.`)) {
			return;
		}
		await api.adminDelete(item.code);
		setItems((current) => current.filter((entry) => entry.code !== item.code));
		shiftCount(item.status, null);
	}

	const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

	return (
		<>
			<div className="inbox-tools">
				<div className="filters">
					{[["", `Tất cả${total ? ` (${total})` : ""}`], ...Object.entries(STATUS_LABEL)].map(
						([value, label]) => (
							<button
								key={value}
								type="button"
								className="chip"
								aria-pressed={filter === value}
								onClick={() => setFilter(value)}
							>
								{label}
								{value && counts[value] ? ` (${counts[value]})` : ""}
							</button>
						),
					)}
				</div>

				<div className="search">
					<input
						className="input"
						type="search"
						placeholder="Tìm theo mã, tên, mô tả hoặc email…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					{search && (
						<button
							type="button"
							className="linkish"
							onClick={() => setSearch("")}
						>
							Xoá tìm kiếm
						</button>
					)}
				</div>

				{/* Người duyệt thường làm theo đợt: lọc "Đã chọn" rồi dựng clip cho cả
				    mẻ. Nút này lấy đúng những bài đang hiện trên màn hình, nên đổi bộ
				    lọc là đổi luôn thứ tải về. */}
				{items.length > 0 && (
					<div className="bundle-bar">
						<a
							className="chip"
							href={api.adminBundleAllUrl(filter, query)}
							download
						>
							⬇ Tải gói {Math.min(items.length, BUNDLE_LIMIT)} bài đang xem
						</a>
						{items.length > BUNDLE_LIMIT && (
							<span className="hint">
								Một lượt tải tối đa {BUNDLE_LIMIT} bài mới nhất.
							</span>
						)}
					</div>
				)}
			</div>

			{busy && (
				<div className="center">
					<div className="spinner" role="status" />
				</div>
			)}

			{!busy && items.length === 0 && (
				<p style={{ color: "var(--muted)" }}>
					{query
						? `Không có bài nào khớp với “${query}”.`
						: "Chưa có bài nào ở mục này."}
				</p>
			)}

			{!busy && items.length > 0 && query && (
				<p className="hint">
					{items.length} bài khớp với “{query}”.
				</p>
			)}

			<div className="cards">
				{items.map((item) => (
					<article className="card" key={item.code}>
						{item.imageUrls.length > 0 ? (
							<div className="card-imgs">
								{item.imageUrls.map((url, index) => (
									// Trước đây mỗi ảnh mở ra một tab trơ trọi, xem xong phải
									// đóng tab quay lại. Giờ phóng to ngay tại chỗ, lật qua lại
									// được giữa các ảnh của cùng một bài.
									<button
										key={url}
										type="button"
										onClick={() => view(item.imageUrls, index)}
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
							<a
								className="chip"
								href={api.adminBundleUrl(item.code)}
								download
							>
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
							<span title={new Date(item.createdAt).toLocaleString("vi-VN")}>
								{relativeTime(item.createdAt)}
							</span>
							<span>{formatBytes(item.bytes)}</span>
						</div>

						<p className="card-desc">{item.description}</p>

						{item.styles.length > 0 && (
							<div className="card-meta">
								<span>
									Kiểu: {styleNames(styles, item.styles, "vi").join(", ")}
								</span>
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
									onClick={() => setStatus(item, value)}
								>
									{label}
								</button>
							))}
						</div>

						{/* Một bài thường lên cả hai kênh. Trước đây chỉ có một ô chung,
						    nên dán link thứ hai là đè mất link thứ nhất. */}
						<div className="field">
							{LINK_FIELDS.map(([field, label]) => (
								<label className="link-field" key={field}>
									<span>{label}</span>
									<input
										className="input"
										type="url"
										placeholder="https://…"
										defaultValue={item[field] ?? ""}
										onBlur={(e) => saveUrl(item, field, e.target.value)}
									/>
								</label>
							))}
							{savedUrl === item.code && (
								<span className="hint" style={{ color: "var(--ok)" }}>
									Đã lưu link.
								</span>
							)}
							{/* Khu "Đã lên sóng" ngoài trang chủ lọc theo link, nên bài đánh
							    dấu xong mà quên dán link sẽ không bao giờ hiện ra. */}
							{item.status === "done" &&
								!item.publishedTiktok &&
								!item.publishedYoutube && (
									<span className="hint" style={{ color: "var(--warn)" }}>
										Chưa có link nào nên bài này không hiện ở khu “Đã lên sóng”.
									</span>
								)}
						</div>

						<div className="card-actions">
							<button
								type="button"
								className="danger"
								onClick={() => remove(item)}
							>
								Xoá vĩnh viễn
							</button>
						</div>
					</article>
				))}
			</div>

			{/* Hộp thư có thể dài hàng trăm bài, mà mỗi thẻ kéo theo ảnh gốc. Lấy
			    từng đợt, và nói rõ đang hiện bao nhiêu để người duyệt biết mình
			    đứng ở đâu. */}
			{!busy && more && (
				<div className="load-more">
					<button
						type="button"
						className="ghost-btn"
						onClick={loadMore}
						disabled={loadingMore}
					>
						{loadingMore ? "Đang tải…" : `Tải thêm ${INBOX_PAGE} bài`}
					</button>
					<span className="hint">Đang hiện {items.length} bài.</span>
				</div>
			)}

			{viewer}
		</>
	);
}
