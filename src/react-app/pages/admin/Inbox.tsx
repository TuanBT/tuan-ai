import { useCallback, useEffect, useState } from "react";
import { api, type AdminSubmission } from "../../lib/api";
import { formatBytes } from "../../lib/compress";
import { BUNDLE_LIMIT, relativeTime, STATUS_LABEL, STATUS_TONE } from "./shared";

export function Inbox() {
	const [items, setItems] = useState<AdminSubmission[]>([]);
	const [counts, setCounts] = useState<Record<string, number>>({});
	const [filter, setFilter] = useState("");
	const [search, setSearch] = useState("");
	const [query, setQuery] = useState("");
	const [busy, setBusy] = useState(true);
	const [savedUrl, setSavedUrl] = useState<string | null>(null);

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
		} finally {
			setBusy(false);
		}
	}, [filter, query]);

	useEffect(() => {
		load();
	}, [load]);

	async function update(code: string, patch: Record<string, unknown>) {
		await api.adminPatch(code, patch);
		load();
	}

	async function saveUrl(item: AdminSubmission, value: string) {
		if (value === (item.publishedUrl ?? "")) return;
		await api.adminPatch(item.code, { publishedUrl: value });
		// Lưu lúc rời ô là im lặng: không có dấu hiệu này thì không ai biết link
		// đã vào hay mình vừa gõ vào chỗ trống.
		setSavedUrl(item.code);
		setTimeout(() => setSavedUrl(null), 1800);
		load();
	}

	async function remove(code: string) {
		if (!confirm(`Xoá vĩnh viễn bài ${code}? Ảnh sẽ bị xoá khỏi kho luôn.`)) {
			return;
		}
		await api.adminDelete(code);
		load();
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
						<span className="hint">
							Mỗi bài một thư mục: ảnh gốc, <code>noi-dung.txt</code> để chép,
							<code> noi-dung.json</code> để tự động hoá.
							{items.length > BUNDLE_LIMIT &&
								` Một lượt tải tối đa ${BUNDLE_LIMIT} bài mới nhất.`}
						</span>
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
								{item.imageUrls.map((url) => (
									<a key={url} href={url} target="_blank" rel="noreferrer">
										<img src={url} alt="" loading="lazy" />
									</a>
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
							<span className="hint">
								{item.imageUrls.length > 0
									? `${item.imageUrls.length} ảnh + nội dung`
									: "chỉ nội dung"}
							</span>
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
								<span>Kiểu: {item.styles.join(", ")}</span>
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
									onClick={() => update(item.code, { status: value })}
								>
									{label}
								</button>
							))}
						</div>

						<div className="field">
							<input
								className="input"
								style={{ fontSize: 13, padding: "8px 11px" }}
								placeholder="Dán link TikTok / YouTube khi đã đăng"
								defaultValue={item.publishedUrl ?? ""}
								onBlur={(e) => saveUrl(item, e.target.value)}
							/>
							{savedUrl === item.code && (
								<span className="hint" style={{ color: "var(--ok)" }}>
									Đã lưu link.
								</span>
							)}
							{/* Khu "Đã lên sóng" ngoài trang chủ lọc theo link, nên bài đánh
							    dấu xong mà quên dán link sẽ không bao giờ hiện ra. */}
							{item.status === "done" && !item.publishedUrl && (
								<span className="hint" style={{ color: "var(--warn)" }}>
									Chưa có link nên bài này không hiện ở khu “Đã lên sóng”.
								</span>
							)}
						</div>

						<div className="card-actions">
							<button
								type="button"
								className="danger"
								onClick={() => remove(item.code)}
							>
								Xoá vĩnh viễn
							</button>
						</div>
					</article>
				))}
			</div>
		</>
	);
}
