import { useEffect, useState } from "react";
import { api, type Stats } from "../../lib/api";
import { formatBytes } from "../../lib/compress";

export function StatsPanel() {
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
				<div className="notice bad">
					<strong>Chưa bật chống bot — form đang đóng.</strong>
					<span>
						Chưa đặt TURNSTILE_SECRET nên trang từ chối nhận bài, thay vì nhận
						mà không kiểm tra gì. Chạy{" "}
						<code>npx wrangler secret put TURNSTILE_SECRET</code> để mở lại.
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
