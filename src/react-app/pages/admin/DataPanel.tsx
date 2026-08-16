import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";

const TABLE_NOTE: Record<string, string> = {
	submissions: "Bài người dùng gửi",
	styles: "Các kiểu hiện trên form",
	settings: "Cấu hình trang",
	daily_usage: "Thống kê theo ngày",
	lookup_misses: "Bộ đếm chặn dò mã",
};

const SAMPLE_QUERIES: Array<[string, string]> = [
	["10 bài mới nhất", "SELECT code, nickname, status FROM submissions ORDER BY created_at DESC LIMIT 10"],
	["Đếm theo trạng thái", "SELECT status, COUNT(*) AS so_bai FROM submissions GROUP BY status"],
	["Kiểu được chọn nhiều", "SELECT styles, COUNT(*) AS n FROM submissions GROUP BY styles ORDER BY n DESC"],
	["Ngày bị chặn", "SELECT day, submissions, blocked FROM daily_usage WHERE blocked > 0 ORDER BY day DESC"],
];

export function DataPanel() {
	const [data, setData] = useState<Awaited<
		ReturnType<typeof api.adminData>
	> | null>(null);
	const [sql, setSql] = useState(SAMPLE_QUERIES[0][1]);
	const [result, setResult] = useState<Awaited<
		ReturnType<typeof api.adminQuery>
	> | null>(null);
	const [queryError, setQueryError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const load = useCallback(() => {
		api.adminData().then(setData).catch(() => {});
	}, []);

	useEffect(load, [load]);

	async function runQuery(event: React.FormEvent) {
		event.preventDefault();
		setQueryError(null);
		try {
			setResult(await api.adminQuery(sql));
		} catch (err) {
			setResult(null);
			setQueryError(
				err instanceof Error && err.message === "chi_cho_phep_select"
					? "Ô này chỉ chạy được câu SELECT. Muốn sửa dữ liệu thì dùng các nút bảo trì bên dưới."
					: err instanceof Error
						? err.message
						: "Câu truy vấn không chạy được.",
			);
		}
	}

	async function danger(
		target: "stats" | "lookups" | "submissions",
		question: string,
	) {
		if (!confirm(question)) return;
		const res = await api.adminReset(target);
		setMessage(
			target === "submissions"
				? `Đã xoá toàn bộ bài gửi và ${res.deleted ?? 0} bộ ảnh.`
				: "Đã xoá xong.",
		);
		load();
	}

	if (!data) {
		return (
			<div className="center">
				<div className="spinner" role="status" />
			</div>
		);
	}

	return (
		<>
			{message && <div className="notice warn">{message}</div>}

			<section>
				<h2 style={{ fontSize: 15 }}>Các bảng trong cơ sở dữ liệu</h2>
				<div className="stat-grid">
					{data.tables.map((table) => (
						<div className="stat" key={table.name}>
							<span className="stat-label">{TABLE_NOTE[table.name] ?? table.name}</span>
							<span className="stat-value">{table.rows}</span>
							<span className="stat-sub">{table.name}</span>
						</div>
					))}
				</div>
			</section>

			<section>
				<h2 style={{ fontSize: 15 }}>Bảo trì</h2>
				<div className="rows">
					<div className="row">
						<div className="row-label">
							<strong>Dọn dữ liệu quá hạn ngay</strong>
							<small>
								{data.duePurge > 0 || data.dueDelete > 0
									? `${data.duePurge} bài chờ dọn ảnh, ${data.dueDelete} dòng quá ${data.dataRetentionDays} ngày chờ xoá.`
									: "Không có gì quá hạn. Bản quét tự chạy 01:00 mỗi đêm."}
							</small>
						</div>
						<button
							type="button"
							className="chip"
							onClick={async () => {
								const res = await api.adminPurge();
								setMessage(
									`Đã dọn ảnh của ${res.images} bài, xoá ${res.rowsDeleted} dòng quá hạn và ${res.emailsCleared} email.`,
								);
								load();
							}}
						>
							Chạy ngay
						</button>
					</div>

					<div className="row">
						<div className="row-label">
							<strong>Tải toàn bộ bài gửi</strong>
							<small>File CSV mở được bằng Excel, không kèm ảnh.</small>
						</div>
						<a className="chip" href="/api/admin/export.csv" download>
							Tải CSV
						</a>
					</div>
				</div>
			</section>

			<section>
				<h2 style={{ fontSize: 15 }}>Xem dữ liệu bằng câu truy vấn</h2>
				<p className="hint">
					Chỉ chạy được câu <code>SELECT</code>. Câu lệnh sửa hay xoá bị chặn —
					gõ nhầm một lần là mất dữ liệu không lấy lại được, nên phần sửa đổi
					nằm ở các nút bảo trì phía trên.
				</p>

				<div className="filters" style={{ margin: "10px 0" }}>
					{SAMPLE_QUERIES.map(([label, query]) => (
						<button
							key={label}
							type="button"
							className="chip"
							onClick={() => setSql(query)}
						>
							{label}
						</button>
					))}
				</div>

				<form onSubmit={runQuery} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<textarea
						className="textarea"
						style={{ fontFamily: "var(--mono)", fontSize: 13, minHeight: 70 }}
						value={sql}
						onChange={(e) => setSql(e.target.value)}
						spellCheck={false}
					/>
					<button className="cta" type="submit" style={{ alignSelf: "flex-start", padding: "10px 22px" }}>
						Chạy
					</button>
				</form>

				{queryError && <div className="error" style={{ marginTop: 10 }}>{queryError}</div>}

				{result && (
					<div style={{ overflowX: "auto", marginTop: 12 }}>
						{result.rows.length === 0 ? (
							<p className="hint">Không có dòng nào khớp.</p>
						) : (
							<table className="data-table">
								<thead>
									<tr>
										{result.columns.map((col) => (
											<th key={col}>{col}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{result.rows.map((row, index) => (
										<tr key={index}>
											{result.columns.map((col) => (
												<td key={col}>{String(row[col] ?? "")}</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				)}
			</section>

			<section>
				<h2 style={{ fontSize: 15, color: "var(--bad)" }}>Vùng nguy hiểm</h2>
				<p className="hint">Các thao tác dưới đây không hoàn tác được.</p>
				<div className="rows">
					<div className="row">
						<div className="row-label">
							<strong>Xoá bộ đếm chặn dò mã</strong>
							<small>Mở khoá cho những người đang bị chặn tra cứu.</small>
						</div>
						<button
							type="button"
							className="chip"
							onClick={() => danger("lookups", "Xoá bộ đếm chặn dò mã?")}
						>
							Xoá
						</button>
					</div>
					<div className="row">
						<div className="row-label">
							<strong>Xoá thống kê theo ngày</strong>
							<small>Biểu đồ 30 ngày và hạn mức hôm nay về 0.</small>
						</div>
						<button
							type="button"
							className="chip"
							onClick={() => danger("stats", "Xoá toàn bộ thống kê theo ngày?")}
						>
							Xoá
						</button>
					</div>
					<div className="row">
						<div className="row-label">
							<strong>Xoá toàn bộ bài gửi</strong>
							<small>Xoá cả ảnh trong kho. Dùng khi dọn dữ liệu thử.</small>
						</div>
						<button
							type="button"
							className="chip danger"
							onClick={() =>
								danger(
									"submissions",
									"XOÁ TOÀN BỘ bài gửi và ảnh kèm theo? Không thể hoàn tác.",
								)
							}
						>
							Xoá tất cả
						</button>
					</div>
				</div>
			</section>
		</>
	);
}
