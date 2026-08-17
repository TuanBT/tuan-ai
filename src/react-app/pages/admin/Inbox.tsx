import { useCallback, useEffect, useState } from "react";
import { api, INBOX_PAGE, type AdminStyle, type AdminSubmission } from "../../lib/api";
import { useImageViewer } from "../../lib/image-viewer";
import { BUNDLE_LIMIT, STATUS_LABEL } from "./shared";
import { SubmissionCard, type Snapshot } from "./SubmissionCard";

interface Props {
	/** Số bài chưa duyệt theo máy chủ, do trang quản trị hỏi lại đều đặn. */
	waiting: number;
	/** Số lần có bài mới tới kể từ lúc mở trang. */
	arrived: number;
	/** Đã tải lại danh sách nên coi như đã xem. */
	onSeen: () => void;
	/** Bảo trang quản trị hỏi lại số bài chờ sau khi danh sách vừa đổi. */
	onRefreshCounts: () => void;
}

export function Inbox({ waiting, arrived, onSeen, onRefreshCounts }: Props) {
	const [items, setItems] = useState<AdminSubmission[]>([]);
	const [counts, setCounts] = useState<Record<string, number>>({});
	const [filter, setFilter] = useState("");
	const [search, setSearch] = useState("");
	const [query, setQuery] = useState("");
	const [busy, setBusy] = useState(true);
	const [more, setMore] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [styles, setStyles] = useState<AdminStyle[]>([]);
	// Bài đã đổi trạng thái trong phiên này, kèm ảnh chụp để hoàn tác.
	const [changed, setChanged] = useState<Record<string, Snapshot>>({});
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
			// Danh sách vừa dựng lại từ đầu nên mọi dải hoàn tác đều hết hạn: thứ
			// chúng nói tới ("thẻ này sẽ rời danh sách khi tải lại") vừa xảy ra rồi.
			setChanged({});
			onSeen();
		} finally {
			setBusy(false);
		}
	}, [filter, query, onSeen]);

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

	/**
	 * Đổi trạng thái một bài.
	 *
	 * Thẻ ở nguyên chỗ cũ dù bộ lọc không còn nhận nó. Trước đây nó bị lọc ra
	 * khỏi danh sách ngay trong cùng một khung hình với cú bấm: người đang lọc
	 * "Đã chọn" mà bấm "Bỏ qua" thì bài biến mất trước khi kịp gõ một chữ lý do —
	 * mà lý do lại chỉ hiện ra *sau* khi bấm bỏ qua. Giờ thẻ ở lại, mang theo một
	 * dải nói rõ nó đã đi đâu và một đường lui.
	 */
	async function setStatus(item: AdminSubmission, status: string) {
		if (item.status === status) return;
		await api.adminPatch(item.code, { status });
		shiftCount(item.status, status);

		setChanged((current) => ({
			...current,
			// Giữ ảnh chụp *đầu tiên*: bấm ba nhát liên tiếp thì đường lui vẫn phải
			// dẫn về chỗ xuất phát, không phải về nhát bấm áp chót.
			[item.code]: current[item.code] ?? {
				status: item.status,
				publishedTiktok: item.publishedTiktok,
				publishedYoutube: item.publishedYoutube,
			},
		}));

		// Bỏ qua thì máy chủ xoá luôn hai link đã dán (xem PATCH bên
		// `routes/admin.ts`); gương ngay ở đây, nếu không thẻ vẫn hiện link cho tới
		// lần tải lại sau.
		patchLocal(
			item.code,
			status === "rejected"
				? { status, publishedTiktok: null, publishedYoutube: null }
				: { status },
		);
		onRefreshCounts();
	}

	/** Trả bài về đúng trạng thái và đúng hai link trước cú bấm gần nhất. */
	async function undo(item: AdminSubmission) {
		const snapshot = changed[item.code];
		if (!snapshot) return;

		await api.adminPatch(item.code, {
			status: snapshot.status,
			// Gửi cả hai link kể cả khi trống: "Bỏ qua" đã xoá chúng ở máy chủ, nên
			// chỉ trả lại trạng thái thôi là hoàn tác nửa vời.
			publishedTiktok: snapshot.publishedTiktok ?? "",
			publishedYoutube: snapshot.publishedYoutube ?? "",
		});
		shiftCount(item.status, snapshot.status);
		patchLocal(item.code, snapshot);
		setChanged((current) => {
			const next = { ...current };
			delete next[item.code];
			return next;
		});
		onRefreshCounts();
	}

	/** Bỏ thẻ khỏi màn hình mà không đụng gì tới dữ liệu. */
	function dismiss(item: AdminSubmission) {
		setItems((current) => current.filter((entry) => entry.code !== item.code));
	}

	/** Lý do bỏ qua. Bỏ trống được: lúc đó người gửi chỉ thấy câu chung. */
	async function saveReason(item: AdminSubmission, value: string) {
		const next = value.trim();
		if (next === (item.rejectReason ?? "")) return;
		await api.adminPatch(item.code, { rejectReason: next });
		patchLocal(item.code, { rejectReason: next || null });
	}

	async function saveUrl(
		item: AdminSubmission,
		field: "publishedTiktok" | "publishedYoutube",
		value: string,
	) {
		if (value === (item[field] ?? "")) return;
		await api.adminPatch(item.code, { [field]: value });
		patchLocal(item.code, { [field]: value || null });
	}

	async function remove(item: AdminSubmission) {
		if (!confirm(`Xoá vĩnh viễn bài ${item.code}? Ảnh sẽ bị xoá khỏi kho luôn.`)) {
			return;
		}
		await api.adminDelete(item.code);
		setItems((current) => current.filter((entry) => entry.code !== item.code));
		shiftCount(item.status, null);
		onRefreshCounts();
	}

	const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

	return (
		<>
			{/* Dải nhắc có bài mới. Người duyệt hay để tab này mở cả buổi, mà danh
			    sách thì chỉ dựng một lần lúc mở: không có dòng này thì bài mới nằm đó
			    tới khi có ai đó nhớ ra là phải bấm F5.

			    Mốc so sánh là "có bài mới hơn lần hỏi trước" chứ không phải "số bài
			    chờ khác số đang hiện": người duyệt vừa bấm đổi trạng thái là hai con
			    số đó lệch nhau ngay, mà lệch kiểu đó thì chẳng có bài mới nào cả. */}
			{arrived > 0 && !busy && (
				<div className="inbox-alert">
					<span>
						Vừa có bài mới gửi tới
						{waiting > 0 && ` — đang có ${waiting} bài chưa duyệt`}.
					</span>
					<button type="button" className="ghost-btn" onClick={load}>
						Tải lại danh sách
					</button>
				</div>
			)}

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
					<SubmissionCard
						key={item.code}
						item={item}
						styles={styles}
						filter={filter}
						changed={changed[item.code] ?? null}
						onStatus={setStatus}
						onReason={saveReason}
						onUrl={saveUrl}
						onUndo={undo}
						onDismiss={dismiss}
						onRemove={remove}
						onView={view}
					/>
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
