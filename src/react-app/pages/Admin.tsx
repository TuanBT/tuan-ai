import { useCallback, useEffect, useState } from "react";
import {
	api,
	type AdminSettings,
	type AdminStyle,
	type AdminSubmission,
	type Stats,
} from "../lib/api";
import { formatBytes } from "../lib/compress";

type Tab = "inbox" | "stats" | "styles" | "settings" | "data";

const DEV_MODE_COOKIE = "tuanai_devmode";

/**
 * Bật tắt chế độ xem giống production ngay trên máy: tắt cửa sau đăng nhập để
 * thấy đúng những gì người lạ thấy, không phải deploy mới kiểm tra được.
 */
function setProdPreview(on: boolean) {
	document.cookie = on
		? `${DEV_MODE_COOKIE}=prod; path=/; max-age=86400; SameSite=Lax`
		: `${DEV_MODE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
	window.location.href = "/admin";
}

const STATUS_LABEL: Record<string, string> = {
	new: "Mới",
	selected: "Đã chọn",
	done: "Đã lên sóng",
	rejected: "Bỏ qua",
};

const LOGIN_ERRORS: Record<string, string> = {
	"khong-co-quyen": "Email này không nằm trong danh sách quản trị.",
	"chua-cau-hinh": "Chưa cấu hình OAuth cho nhà cung cấp đó.",
	state: "Phiên đăng nhập hết hạn. Bạn thử lại nhé.",
	"doi-ma-that-bai": "Không đổi được mã đăng nhập. Kiểm tra lại client secret.",
	"khong-doc-duoc-email": "Không đọc được email đã xác minh từ tài khoản đó.",
};

export function Admin() {
	const [me, setMe] = useState<Awaited<ReturnType<typeof api.me>> | null>(null);
	const [tab, setTab] = useState<Tab>("inbox");

	useEffect(() => {
		api.me().then(setMe).catch(() => setMe(null));
	}, []);

	if (!me) {
		return (
			<div className="center">
				<div className="spinner" role="status" />
			</div>
		);
	}

	if (!me.session) return <Login me={me} />;

	return (
		<div className="admin">
			<header className="topbar">
				<strong>Tuân AI · Quản trị</strong>
				<div style={{ display: "flex", gap: 8 }}>
					{me.devBypassAvailable && (
						<button
							type="button"
							className="cta-ghost"
							style={{ padding: "7px 14px", fontSize: 13 }}
							onClick={() => setProdPreview(true)}
							title="Tắt cửa sau để xem trang y như trên production"
						>
							Xem như production
						</button>
					)}
					<button
						type="button"
						className="cta-ghost"
						style={{ padding: "7px 14px", fontSize: 13 }}
						onClick={() => api.logout().then(() => window.location.reload())}
					>
						Thoát
					</button>
				</div>
			</header>

			{me.devBypassAvailable && (
				<div className="notice warn">
					<strong>Đang ở chế độ phát triển.</strong>
					<span>
						Bạn được đăng nhập sẵn nhờ cửa sau trong <code>.dev.vars</code>. Trên
						production không có cửa sau này.
					</span>
				</div>
			)}

			<nav className="tabs" role="tablist">
				{(
					[
						["inbox", "Bài gửi"],
						["stats", "Thống kê"],
						["styles", "Kiểu"],
						["settings", "Cài đặt"],
						["data", "Dữ liệu"],
					] as Array<[Tab, string]>
				).map(([id, label]) => (
					<button
						key={id}
						role="tab"
						aria-selected={tab === id}
						onClick={() => setTab(id)}
					>
						{label}
					</button>
				))}
			</nav>

			{tab === "inbox" && <Inbox />}
			{tab === "stats" && <StatsPanel />}
			{tab === "styles" && <StylesPanel />}
			{tab === "settings" && <SettingsPanel />}
			{tab === "data" && <DataPanel />}
		</div>
	);
}

function Login({ me }: { me: Awaited<ReturnType<typeof api.me>> }) {
	const error = new URLSearchParams(window.location.search).get("error");

	return (
		<div className="login">
			<h1 style={{ fontSize: 22, margin: 0 }}>Đăng nhập quản trị</h1>
			{error && <div className="error">{LOGIN_ERRORS[error] ?? error}</div>}

			{me.prodPreview && (
				<div className="notice warn">
					<strong>Đang xem như production.</strong>
					<span>
						Đây đúng là màn hình người lạ nhìn thấy. Đăng nhập bằng nút dưới,
						hoặc quay lại chế độ phát triển.
					</span>
					<button
						type="button"
						className="cta-ghost"
						style={{ marginTop: 8 }}
						onClick={() => setProdPreview(false)}
					>
						Quay lại chế độ phát triển
					</button>
				</div>
			)}

			{!me.configured && (
				<div className="notice warn">
					<strong>Chưa đặt ADMIN_EMAILS.</strong>
					<span>
						Chạy <code>npx wrangler secret put ADMIN_EMAILS</code> rồi thử lại.
					</span>
				</div>
			)}

			{me.providers.google && (
				<a className="cta" href="/auth/google">
					Đăng nhập với Google
				</a>
			)}
			{me.providers.github && (
				<a className="cta-ghost" href="/auth/github" style={{ textAlign: "center", textDecoration: "none" }}>
					Đăng nhập với GitHub
				</a>
			)}

			{!me.providers.google && !me.providers.github && (
				<div className="notice bad">
					<strong>Chưa cấu hình đăng nhập.</strong>
					<span>Xem phần “Đăng nhập” trong README để tạo ứng dụng OAuth.</span>
				</div>
			)}
		</div>
	);
}

function Inbox() {
	const [items, setItems] = useState<AdminSubmission[]>([]);
	const [counts, setCounts] = useState<Record<string, number>>({});
	const [filter, setFilter] = useState("");
	const [busy, setBusy] = useState(true);

	const load = useCallback(async () => {
		setBusy(true);
		try {
			const data = await api.adminList(filter);
			setItems(data.items);
			setCounts(data.counts);
		} finally {
			setBusy(false);
		}
	}, [filter]);

	useEffect(() => {
		load();
	}, [load]);

	async function update(code: string, patch: Record<string, unknown>) {
		await api.adminPatch(code, patch);
		load();
	}

	async function remove(code: string) {
		if (!confirm(`Xoá vĩnh viễn bài ${code}? Ảnh sẽ bị xoá khỏi kho luôn.`)) {
			return;
		}
		await api.adminDelete(code);
		load();
	}

	return (
		<>
			<div className="filters">
				{[["", "Tất cả"], ...Object.entries(STATUS_LABEL)].map(
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

			{busy && (
				<div className="center">
					<div className="spinner" role="status" />
				</div>
			)}

			{!busy && items.length === 0 && (
				<p style={{ color: "var(--muted)" }}>Chưa có bài nào ở mục này.</p>
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

						<div className="card-meta">
							<span>{item.code}</span>
							<span>{new Date(item.createdAt).toLocaleString("vi-VN")}</span>
							<span>{formatBytes(item.bytes)}</span>
						</div>

						<strong style={{ fontSize: 14 }}>{item.nickname}</strong>
						<p className="card-desc">{item.description}</p>

						{item.styles.length > 0 && (
							<div className="card-meta">
								<span>Kiểu: {item.styles.join(", ")}</span>
							</div>
						)}
						{item.email && <div className="card-meta"><span>{item.email}</span></div>}

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

						<input
							className="input"
							style={{ fontSize: 13, padding: "8px 11px" }}
							placeholder="Dán link TikTok / YouTube khi đã đăng"
							defaultValue={item.publishedUrl ?? ""}
							onBlur={(e) => {
								if (e.target.value !== (item.publishedUrl ?? "")) {
									update(item.code, { publishedUrl: e.target.value });
								}
							}}
						/>

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

function StatsPanel() {
	const [stats, setStats] = useState<Stats | null>(null);

	useEffect(() => {
		api.adminStats().then(setStats).catch(() => {});
	}, []);

	if (!stats) {
		return (
			<div className="center">
				<div className="spinner" role="status" />
			</div>
		);
	}

	const writePct = Math.min(
		100,
		(stats.today.kv_writes / stats.writeBudget) * 100,
	);
	const storagePct = Math.min(
		100,
		(stats.storedBytes / stats.storageLimitBytes) * 100,
	);
	const peak = Math.max(1, ...stats.history.map((row) => row.submissions));

	return (
		<>
			{stats.shouldUpgrade && (
				<div className="notice bad">
					<strong>Đến lúc chuyển sang R2.</strong>
					<span>
						Ba ngày liên tiếp có người muốn gửi bài nhưng bị chặn vì hết hạn
						mức. Bật R2 trong dashboard rồi đổi một dòng trong{" "}
						<code>src/worker/lib/storage.ts</code>.
					</span>
				</div>
			)}

			{!stats.turnstileConfigured && (
				<div className="notice warn">
					<strong>Chưa bật chống bot.</strong>
					<span>
						Chưa đặt TURNSTILE_SECRET nên form đang nhận bài mà không kiểm tra
						captcha.
					</span>
				</div>
			)}

			<div className="stat-grid">
				<div className="stat">
					<span className="stat-label">Lượt ghi hôm nay</span>
					<span className="stat-value">{stats.today.kv_writes}</span>
					<div
						className={`meter ${writePct > 90 ? "bad" : writePct > 60 ? "warn" : "ok"}`}
					>
						<span style={{ width: `${writePct}%` }} />
					</div>
					<span className="stat-sub">
						còn {stats.remainingWrites} / {stats.writeBudget} (trần thật{" "}
						{stats.kvFreeDailyWrites})
					</span>
				</div>

				<div className="stat">
					<span className="stat-label">Bài nhận hôm nay</span>
					<span className="stat-value">{stats.today.submissions}</span>
					<span className="stat-sub">{formatBytes(stats.today.bytes)}</span>
				</div>

				<div className="stat">
					<span className="stat-label">Lượt bị chặn hôm nay</span>
					<span className="stat-value">{stats.today.blocked}</span>
					<span className="stat-sub">
						{stats.today.blocked > 0
							? "Có người gửi không được"
							: "Chưa mất bài nào"}
					</span>
				</div>

				<div className="stat">
					<span className="stat-label">Dung lượng đang giữ</span>
					<span className="stat-value">{formatBytes(stats.storedBytes)}</span>
					<div
						className={`meter ${storagePct > 90 ? "bad" : storagePct > 60 ? "warn" : "ok"}`}
					>
						<span style={{ width: `${storagePct}%` }} />
					</div>
					<span className="stat-sub">
						{stats.storedSubmissions} bài / trần 1 GB
					</span>
				</div>
			</div>

			<section>
				<h2 style={{ fontSize: 15 }}>30 ngày gần nhất</h2>
				<div className="bars">
					{stats.history.map((row) => (
						<div
							key={row.day}
							className={`bar ${row.blocked > 0 ? "has-blocked" : ""}`}
							title={`${row.day}: ${row.submissions} bài, ${row.blocked} lượt bị chặn`}
						>
							<i style={{ height: `${(row.submissions / peak) * 100}%` }} />
						</div>
					))}
				</div>
				<p className="hint" style={{ marginTop: 8 }}>
					Cột đỏ là ngày có người bị chặn. Ngày reset tính theo giờ UTC, tức 7
					giờ sáng Việt Nam.
				</p>
			</section>
		</>
	);
}

function StylesPanel() {
	const [items, setItems] = useState<AdminStyle[]>([]);
	const [draft, setDraft] = useState({ id: "", label_vi: "", label_en: "" });

	const load = useCallback(() => {
		api.adminStyles().then((data) => setItems(data.items)).catch(() => {});
	}, []);

	useEffect(load, [load]);

	async function add(event: React.FormEvent) {
		event.preventDefault();
		if (!draft.id || !draft.label_vi) return;
		await api.adminStyleSave({ ...draft, sort_order: items.length + 1 });
		setDraft({ id: "", label_vi: "", label_en: "" });
		load();
	}

	return (
		<>
			<p className="hint">
				Đây là các lựa chọn người dùng thấy khi gửi bài. Tắt thì ẩn khỏi form
				nhưng bài cũ vẫn giữ nguyên.
			</p>

			<div className="rows">
				{items.map((style) => (
					<div className="row" key={style.id}>
						<div className="row-label">
							<strong>{style.label_vi}</strong>
							<small>
								{style.id} · {style.label_en}
							</small>
						</div>
						<button
							type="button"
							className="chip"
							aria-pressed={style.active === 1}
							onClick={async () => {
								await api.adminStylePatch(style.id, { active: !style.active });
								load();
							}}
						>
							{style.active ? "Đang hiện" : "Đang ẩn"}
						</button>
						<button
							type="button"
							className="chip"
							onClick={async () => {
								if (!confirm(`Xoá kiểu “${style.label_vi}”?`)) return;
								await api.adminStyleDelete(style.id);
								load();
							}}
						>
							Xoá
						</button>
					</div>
				))}
			</div>

			<form className="row" onSubmit={add}>
				<input
					className="input"
					placeholder="mã (vd: sketch)"
					value={draft.id}
					onChange={(e) => setDraft({ ...draft, id: e.target.value })}
				/>
				<input
					className="input"
					placeholder="Nhãn tiếng Việt"
					value={draft.label_vi}
					onChange={(e) => setDraft({ ...draft, label_vi: e.target.value })}
				/>
				<input
					className="input"
					placeholder="Nhãn tiếng Anh"
					value={draft.label_en}
					onChange={(e) => setDraft({ ...draft, label_en: e.target.value })}
				/>
				<button className="cta" type="submit" style={{ padding: "10px 18px" }}>
					Thêm
				</button>
			</form>
		</>
	);
}

const SETTING_LABELS: Array<[keyof AdminSettings, string, string]> = [
	["retention_days", "Số ngày giữ ảnh", "Sau ngần này ngày ảnh gốc tự xoá."],
	["max_images", "Số ảnh tối đa mỗi bài", "Từ 1 đến 5."],
	[
		"daily_write_budget",
		"Ngân sách ghi mỗi ngày",
		"Trần thật của KV là 1.000. Để 850 cho an toàn.",
	],
	["max_per_ip_day", "Số bài tối đa mỗi người/ngày", "Tính theo địa chỉ mạng."],
	["site_title", "Tên hiển thị", ""],
	["tagline_vi", "Câu giới thiệu (Việt)", ""],
	["tagline_en", "Câu giới thiệu (Anh)", ""],
];

function SettingsPanel() {
	const [settings, setSettings] = useState<AdminSettings | null>(null);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		api.adminSettings().then(setSettings).catch(() => {});
	}, []);

	if (!settings) {
		return (
			<div className="center">
				<div className="spinner" role="status" />
			</div>
		);
	}

	async function save(patch: Partial<AdminSettings>) {
		const next = await api.adminSettingsSave(patch);
		setSettings(next);
		setSaved(true);
		setTimeout(() => setSaved(false), 1600);
	}

	return (
		<>
			<div className="row">
				<div className="row-label">
					<strong>Nhận bài</strong>
					<small>Tắt thì trang chủ hiện thông báo tạm ngưng.</small>
				</div>
				<button
					type="button"
					className="chip"
					aria-pressed={settings.submissions_open}
					onClick={() => save({ submissions_open: !settings.submissions_open })}
				>
					{settings.submissions_open ? "Đang mở" : "Đang đóng"}
				</button>
			</div>

			<div className="rows">
				{SETTING_LABELS.map(([key, label, hint]) => (
					<div className="row" key={key}>
						<div className="row-label">
							<strong>{label}</strong>
							{hint && <small>{hint}</small>}
						</div>
						<input
							className="input"
							defaultValue={String(settings[key])}
							onBlur={(e) => {
								if (e.target.value !== String(settings[key])) {
									save({ [key]: e.target.value } as Partial<AdminSettings>);
								}
							}}
						/>
					</div>
				))}
			</div>

			<p className="hint">
				Đổi số ngày giữ ảnh sẽ có hiệu lực với cả bài cũ — bản quét chạy mỗi
				đêm sẽ dọn những bài đã quá hạn mới.
			</p>

			{saved && <div className="notice warn">Đã lưu.</div>}
		</>
	);
}
