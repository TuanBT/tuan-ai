import { useCallback, useEffect, useState } from "react";
import { api, type AdminSubmission } from "../../lib/api";
import { formatBytes } from "../../lib/compress";
import { STATUS_LABEL } from "./shared";

export function Inbox() {
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
		if (
			!confirm(
				`Xoá vĩnh viễn bài ${code}? Ảnh sẽ bị xoá khỏi kho luôn.`,
			)
		) {
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
