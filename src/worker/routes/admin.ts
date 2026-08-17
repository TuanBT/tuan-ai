import { Hono } from "hono";
import { requireAdmin } from "./auth";
import {
	indexText,
	STATUS_SLUG,
	submissionEntries,
	type SubmissionRow,
} from "../lib/bundle";
import { blobs } from "../lib/storage";
import { remainingWrites, usageToday } from "../lib/quota";
import { readSettings, writeSettings } from "../lib/settings";
import { purgeExpired } from "../lib/purge";
import { zipStream, type ZipFile } from "../lib/zip";
import { clampText, isCode, normalizeCode, utcDay } from "../lib/util";

const STATUSES = new Set(["new", "selected", "done", "rejected"]);
const KV_FREE_DAILY_WRITES = 1000;
const KV_FREE_BYTES = 1024 ** 3;

/**
 * Trần số bài cho một gói tải cả đợt.
 *
 * Mỗi bài tối đa 2 ảnh × 1,5 MB, nên 25 bài đã là gói cả trăm MB và vài phút
 * chờ. Cắt ở đây để một cú bấm nhầm không thành một lượt tải bất tận, còn muốn
 * lấy tiếp thì lọc theo trạng thái rồi tải đợt sau.
 */
const MAX_BUNDLE = 25;

/**
 * Điều kiện lọc hộp thư, dùng chung cho danh sách và cho gói tải cả đợt: hai chỗ
 * lệch nhau thì thứ tải về không còn là thứ đang nhìn thấy trên màn hình.
 *
 * Dựng theo mảng chứ không nối chuỗi tham số đánh số (?1, ?2…): số thứ tự rất dễ
 * lệch khi có nhánh bật tắt, mà lệch một chỗ là truy vấn trả về nhầm bài.
 */
function inboxFilter(status: string, search: string) {
	const where: string[] = [];
	const params: unknown[] = [];

	if (STATUSES.has(status)) {
		where.push("status = ?");
		params.push(status);
	}

	if (search) {
		// LIKE coi `%` và `_` là ký tự đại diện. Ai gõ "100%" để tìm mà không
		// thoát thì câu lệnh khớp toàn bộ bảng.
		const needle = `%${search.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
		where.push(
			`(code LIKE ? ESCAPE '\\'
			  OR nickname LIKE ? ESCAPE '\\'
			  OR description LIKE ? ESCAPE '\\'
			  OR IFNULL(email, '') LIKE ? ESCAPE '\\')`,
		);
		params.push(needle, needle, needle, needle);
	}

	return { where, params };
}

/** Bảng tra mã kiểu → nhãn tiếng Việt, đọc một lần cho cả gói. */
async function styleLabels(db: D1Database): Promise<Map<string, string>> {
	const rows = await db
		.prepare("SELECT id, label_vi FROM styles")
		.all<{ id: string; label_vi: string }>();
	return new Map(rows.results.map((row) => [row.id, row.label_vi]));
}

function zipResponse(
	files: AsyncIterable<ZipFile>,
	filename: string,
): Response {
	return new Response(zipStream(files), {
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": `attachment; filename="${filename}"`,
			// Gói dựng dần theo luồng nên không biết trước tổng dung lượng; nói rõ
			// để proxy nào đó không cố gom lại rồi tự đặt Content-Length sai.
			"Cache-Control": "no-store",
		},
	});
}

export function adminRoutes() {
	const app = new Hono<{ Bindings: Env }>();

	app.use("/api/admin/*", async (c, next) => {
		if (!(await requireAdmin(c))) return c.json({ error: "unauthorized" }, 401);
		await next();
	});

	app.get("/api/admin/submissions", async (c) => {
		const status = c.req.query("status") ?? "";
		const search = clampText(c.req.query("q"), 80);
		const limit = Math.min(Number(c.req.query("limit")) || 40, 100);
		const before = Number(c.req.query("before")) || Date.now() + 1;

		const filter = inboxFilter(status, search);
		const where = ["created_at < ?", ...filter.where];
		const params: unknown[] = [before, ...filter.params];

		const rows = await c.env.DB.prepare(
			`SELECT * FROM submissions
			 WHERE ${where.join(" AND ")}
			 ORDER BY created_at DESC LIMIT ?`,
		)
			.bind(...params, limit)
			.all<SubmissionRow>();

		const counts = await c.env.DB.prepare(
			"SELECT status, COUNT(*) AS n FROM submissions GROUP BY status",
		).all<{ status: string; n: number }>();

		return c.json({
			items: rows.results.map((row) => ({
				code: row.code,
				nickname: row.nickname,
				email: row.email,
				description: row.description,
				styles: JSON.parse(row.styles) as string[],
				status: row.status,
				publishedTiktok: row.published_tiktok,
				publishedYoutube: row.published_youtube,
				rejectReason: row.reject_reason,
				adminNote: row.admin_note,
				lang: row.lang,
				bytes: row.bytes,
				createdAt: row.created_at,
				expiresAt: row.expires_at,
				imageUrls: row.images_purged
					? []
					: (JSON.parse(row.images) as unknown[]).map(
							(_, index) => `/i/${row.code}/${index}`,
						),
				imagesPurged: Boolean(row.images_purged),
			})),
			counts: Object.fromEntries(counts.results.map((r) => [r.status, r.n])),
		});
	});

	/**
	 * Đếm bài đang chờ xử lý. Nhẹ hơn hẳn `/api/admin/submissions` vì không kèm
	 * nội dung bài nào, nên gọi lại được vài chục giây một lần mà không tốn gì.
	 *
	 * Có mặt để chủ trang biết có bài mới mà không phải tự nhớ vào xem: chân
	 * trang và trang quản trị đều đọc con số này.
	 */
	app.get("/api/admin/pending", async (c) => {
		const row = await c.env.DB.prepare(
			`SELECT
			   SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS fresh,
			   SUM(CASE WHEN status = 'selected' THEN 1 ELSE 0 END) AS picked,
			   MAX(CASE WHEN status = 'new' THEN created_at END) AS latest
			 FROM submissions`,
		).first<{ fresh: number | null; picked: number | null; latest: number | null }>();

		return c.json({
			// Bảng rỗng thì SUM trả về NULL chứ không phải 0.
			new: row?.fresh ?? 0,
			selected: row?.picked ?? 0,
			// Mốc của bài mới nhất chưa duyệt: giao diện so mốc này với mốc lần
			// trước để biết vừa có bài *mới tới*, chứ không chỉ là "vẫn còn tồn".
			latestAt: row?.latest ?? null,
		});
	});

	app.patch("/api/admin/submissions/:code", async (c) => {
		const code = c.req.param("code").toUpperCase();
		if (!isCode(code)) return c.json({ error: "invalid_code" }, 400);

		const body = (await c.req.json()) as Record<string, unknown>;
		// Bảng cột → giá trị, không phải hai mảng chạy song song: một lượt PATCH có
		// thể chạm tới cùng một cột hai lần (xem chỗ bỏ qua ở cuối), mà `SET a = ?,
		// a = ?` thì tuỳ cơ sở dữ liệu muốn hiểu sao cũng được.
		const sets = new Map<string, unknown>();

		if (typeof body.status === "string" && STATUSES.has(body.status)) {
			sets.set("status", body.status);
		}
		// Hai kênh, hai cột, cùng một luật: bỏ trống được, mà đã điền thì phải là
		// https. Duyệt theo bảng để thêm kênh thứ ba sau này chỉ là thêm một dòng.
		for (const [field, column] of [
			["publishedTiktok", "published_tiktok"],
			["publishedYoutube", "published_youtube"],
		] as const) {
			if (!(field in body)) continue;
			const url = clampText(body[field], 500);
			if (url && !/^https:\/\//.test(url)) {
				return c.json({ error: "bad_url" }, 400);
			}
			sets.set(column, url || null);
		}
		if ("adminNote" in body) {
			sets.set("admin_note", clampText(body.adminNote, 1000) || null);
		}
		// Lý do bỏ qua: người gửi đọc được, nên giữ ngắn.
		if ("rejectReason" in body) {
			sets.set("reject_reason", clampText(body.rejectReason, 500) || null);
		}

		// Bỏ qua nghĩa là không có clip nào để xem. Xoá sau cùng để luật này thắng
		// mọi thứ đi kèm trong cùng một lượt: một bài từng lên sóng rồi bị gỡ mà
		// vẫn còn link thì trang tra cứu vẫn mời người gửi bấm vào chỗ trống.
		if (body.status === "rejected") {
			sets.set("published_tiktok", null);
			sets.set("published_youtube", null);
		}

		if (!sets.size) return c.json({ error: "nothing_to_update" }, 400);

		const columns = [...sets.keys()];
		await c.env.DB.prepare(
			`UPDATE submissions SET ${columns.map((name) => `${name} = ?`).join(", ")} WHERE code = ?`,
		)
			.bind(...columns.map((name) => sets.get(name)), code)
			.run();

		return c.json({ ok: true });
	});

	app.delete("/api/admin/submissions/:code", async (c) => {
		const code = c.req.param("code").toUpperCase();
		if (!isCode(code)) return c.json({ error: "invalid_code" }, 400);

		const row = await c.env.DB.prepare(
			"SELECT images FROM submissions WHERE code = ?",
		)
			.bind(code)
			.first<{ images: string }>();
		if (!row) return c.json({ error: "not_found" }, 404);

		const store = blobs(c.env);
		const images = JSON.parse(row.images) as Array<{ key: string }>;
		await Promise.all(images.map((image) => store.delete(image.key)));

		await c.env.DB.prepare("DELETE FROM submissions WHERE code = ?")
			.bind(code)
			.run();

		return c.json({ ok: true });
	});

	// ---------- Gói làm việc: ảnh + nội dung của bài, tải một lần ----------

	app.get("/api/admin/bundle.zip", async (c) => {
		const status = c.req.query("status") ?? "";
		const filter = inboxFilter(status, clampText(c.req.query("q"), 80));
		const clause = filter.where.length
			? `WHERE ${filter.where.join(" AND ")}`
			: "";

		const rows = await c.env.DB.prepare(
			`SELECT * FROM submissions ${clause} ORDER BY created_at DESC LIMIT ?`,
		)
			.bind(...filter.params, MAX_BUNDLE)
			.all<SubmissionRow>();

		// Kiểm tra trước khi mở luồng: gói đã bắt đầu chảy thì không đổi được mã
		// trạng thái nữa, người bấm chỉ nhận về một tệp zip rỗng mà không hiểu vì sao.
		if (!rows.results.length) return c.json({ error: "khong_co_bai" }, 404);

		const labels = await styleLabels(c.env.DB);
		const slug = STATUS_SLUG[status] ?? "tat-ca";
		return zipResponse(
			bundleEntries(c.env, rows.results, labels),
			`tuan-ai-${slug}-${utcDay()}.zip`,
		);
	});

	app.get("/api/admin/bundle/:code", async (c) => {
		const code = normalizeCode(c.req.param("code").replace(/\.zip$/i, ""));
		if (!isCode(code)) return c.json({ error: "invalid_code" }, 400);

		const row = await c.env.DB.prepare(
			"SELECT * FROM submissions WHERE code = ?",
		)
			.bind(code)
			.first<SubmissionRow>();
		if (!row) return c.json({ error: "not_found" }, 404);

		const labels = await styleLabels(c.env.DB);
		return zipResponse(
			submissionEntries(c.env, row, labels),
			`${code.toLowerCase()}.zip`,
		);
	});

	app.get("/api/admin/stats", async (c) => {
		const settings = await readSettings(c.env.DB);
		const usage = await usageToday(c.env.DB);

		const history = await c.env.DB.prepare(
			"SELECT * FROM daily_usage ORDER BY day DESC LIMIT 30",
		).all<{
			day: string;
			submissions: number;
			kv_writes: number;
			blocked: number;
			blocked_ip: number;
			bytes: number;
		}>();

		const stored = await c.env.DB.prepare(
			"SELECT COALESCE(SUM(bytes), 0) AS bytes, COUNT(*) AS n FROM submissions WHERE images_purged = 0",
		).first<{ bytes: number; n: number }>();

		const blockedRun = await c.env.DB.prepare(
			"SELECT day, blocked FROM daily_usage ORDER BY day DESC LIMIT 3",
		).all<{ day: string; blocked: number }>();

		// Quy tắc nâng cấp: ba ngày liên tiếp có người bị chặn nghĩa là đang mất
		// bài thật, đó là lúc chuyển sang R2.
		const shouldUpgrade =
			blockedRun.results.length === 3 &&
			blockedRun.results.every((row) => row.blocked > 0);

		return c.json({
			today: usage,
			remainingWrites: remainingWrites(usage, settings.daily_write_budget),
			writeBudget: settings.daily_write_budget,
			kvFreeDailyWrites: KV_FREE_DAILY_WRITES,
			storedBytes: stored?.bytes ?? 0,
			storedSubmissions: stored?.n ?? 0,
			storageLimitBytes: KV_FREE_BYTES,
			history: history.results.reverse(),
			shouldUpgrade,
			turnstileConfigured: Boolean(c.env.TURNSTILE_SECRET),
		});
	});

	app.get("/api/admin/styles", async (c) => {
		const rows = await c.env.DB.prepare(
			"SELECT * FROM styles ORDER BY sort_order, id",
		).all();
		return c.json({ items: rows.results });
	});

	app.post("/api/admin/styles", async (c) => {
		const body = (await c.req.json()) as Record<string, unknown>;
		const id = clampText(body.id, 40).toLowerCase().replace(/[^a-z0-9-]/g, "");
		const labelVi = clampText(body.label_vi, 80);
		const labelEn = clampText(body.label_en, 80);
		if (!id || !labelVi) return c.json({ error: "missing_fields" }, 400);

		await c.env.DB.prepare(
			`INSERT INTO styles (id, label_vi, label_en, sort_order, active)
			 VALUES (?1, ?2, ?3, ?4, 1)
			 ON CONFLICT(id) DO UPDATE SET
			   label_vi = excluded.label_vi,
			   label_en = excluded.label_en`,
		)
			.bind(id, labelVi, labelEn || labelVi, Number(body.sort_order) || 99)
			.run();

		return c.json({ ok: true });
	});

	app.patch("/api/admin/styles/:id", async (c) => {
		const body = (await c.req.json()) as Record<string, unknown>;
		const sets: string[] = [];
		const values: unknown[] = [];

		for (const field of ["label_vi", "label_en"] as const) {
			if (field in body) {
				sets.push(`${field} = ?`);
				values.push(clampText(body[field], 80));
			}
		}
		if ("active" in body) {
			sets.push("active = ?");
			values.push(body.active ? 1 : 0);
		}
		if ("sort_order" in body) {
			sets.push("sort_order = ?");
			values.push(Number(body.sort_order) || 0);
		}
		if (!sets.length) return c.json({ error: "nothing_to_update" }, 400);

		values.push(c.req.param("id"));
		await c.env.DB.prepare(`UPDATE styles SET ${sets.join(", ")} WHERE id = ?`)
			.bind(...values)
			.run();

		return c.json({ ok: true });
	});

	app.delete("/api/admin/styles/:id", async (c) => {
		await c.env.DB.prepare("DELETE FROM styles WHERE id = ?")
			.bind(c.req.param("id"))
			.run();
		return c.json({ ok: true });
	});

	app.get("/api/admin/settings", async (c) => {
		return c.json(await readSettings(c.env.DB));
	});

	app.put("/api/admin/settings", async (c) => {
		const body = (await c.req.json()) as Record<string, unknown>;
		const patch: Record<string, string> = {};
		for (const [key, value] of Object.entries(body)) {
			patch[key] = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
		}
		await writeSettings(c.env.DB, patch);
		return c.json(await readSettings(c.env.DB));
	});

	// ---------- Dữ liệu: xem và bảo trì mà không cần vào dashboard Cloudflare ----------

	app.get("/api/admin/data", async (c) => {
		const counts = await c.env.DB.batch<{ n: number }>(
			TABLES.map((table) =>
				c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`),
			),
		);

		const settings = await readSettings(c.env.DB);
		const now = Date.now();

		const pending = await c.env.DB.prepare(
			`SELECT COUNT(*) AS n FROM submissions
			 WHERE images_purged = 0 AND MIN(expires_at, created_at + ?1) <= ?2`,
		)
			.bind(settings.retention_days * 86_400_000, now)
			.first<{ n: number }>();

		const stale = await c.env.DB.prepare(
			`SELECT COUNT(*) AS n FROM submissions
			 WHERE created_at < ?1 AND (email IS NOT NULL OR ip_hash IS NOT NULL)`,
		)
			.bind(now - settings.data_retention_days * 86_400_000)
			.first<{ n: number }>();

		return c.json({
			tables: TABLES.map((table, index) => ({
				name: table,
				rows: counts[index].results[0]?.n ?? 0,
			})),
			duePurge: pending?.n ?? 0,
			dueClear: stale?.n ?? 0,
			dataRetentionDays: settings.data_retention_days,
		});
	});

	app.post("/api/admin/query", async (c) => {
		const { sql } = (await c.req.json()) as { sql?: string };
		const safe = readOnlySql(String(sql ?? ""));
		if (!safe) {
			return c.json({ error: "chi_cho_phep_select" }, 400);
		}

		try {
			const result = await c.env.DB.prepare(safe).all();
			const rows = result.results as Array<Record<string, unknown>>;
			return c.json({
				sql: safe,
				columns: rows.length ? Object.keys(rows[0]) : [],
				rows,
			});
		} catch (err) {
			return c.json({ error: String(err instanceof Error ? err.message : err) }, 400);
		}
	});

	app.post("/api/admin/purge", async (c) => c.json(await purgeExpired(c.env)));

	app.get("/api/admin/export.csv", async (c) => {
		const rows = await c.env.DB.prepare(
			`SELECT code, nickname, email, description, styles, status,
			        published_tiktok, published_youtube, admin_note, reject_reason,
			        lang, bytes, created_at
			 FROM submissions ORDER BY created_at DESC`,
		).all<Record<string, unknown>>();

		const header = [
			"ma",
			"ten",
			"email",
			"mo_ta",
			"kieu",
			"trang_thai",
			"link_tiktok",
			"link_youtube",
			"ghi_chu",
			"ly_do_bo_qua",
			"ngon_ngu",
			"dung_luong",
			"ngay_gui",
		];

		const body = rows.results.map((row) =>
			[
				row.code,
				row.nickname,
				row.email ?? "",
				row.description,
				row.styles,
				row.status,
				row.published_tiktok ?? "",
				row.published_youtube ?? "",
				row.admin_note ?? "",
				row.reject_reason ?? "",
				row.lang,
				row.bytes,
				new Date(Number(row.created_at)).toISOString(),
			]
				.map(csvCell)
				.join(","),
		);

		// BOM để Excel mở tiếng Việt không bị vỡ dấu.
		const csv = `\uFEFF${[header.join(","), ...body].join("\r\n")}`;
		return new Response(csv, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="tuan-ai-${utcDay()}.csv"`,
			},
		});
	});

	app.post("/api/admin/reset", async (c) => {
		const { target } = (await c.req.json()) as { target?: string };

		if (target === "stats") {
			await c.env.DB.prepare("DELETE FROM daily_usage").run();
			return c.json({ ok: true });
		}
		if (target === "lookups") {
			await c.env.DB.prepare("DELETE FROM lookup_misses").run();
			return c.json({ ok: true });
		}
		if (target === "submissions") {
			// Xoá ảnh trong kho trước, nếu không chúng nằm lại tới khi hết TTL.
			const rows = await c.env.DB.prepare(
				"SELECT images FROM submissions WHERE images_purged = 0",
			).all<{ images: string }>();

			const store = blobs(c.env);
			for (const row of rows.results) {
				const images = JSON.parse(row.images) as Array<{ key: string }>;
				await Promise.all(images.map((image) => store.delete(image.key)));
			}
			await c.env.DB.prepare("DELETE FROM submissions").run();
			return c.json({ ok: true, deleted: rows.results.length });
		}

		return c.json({ error: "unknown_target" }, 400);
	});

	return app;
}

/** Gói cả đợt: mục lục ở gốc, rồi mỗi bài một thư mục mang tên mã bài. */
async function* bundleEntries(
	env: Env,
	rows: SubmissionRow[],
	labels: Map<string, string>,
): AsyncGenerator<ZipFile> {
	yield {
		name: "danh-sach.txt",
		data: new TextEncoder().encode(indexText(rows, labels)),
	};
	for (const row of rows) {
		yield* submissionEntries(env, row, labels, `${row.code}/`);
	}
}

const TABLES = [
	"submissions",
	"styles",
	"settings",
	"daily_usage",
	"lookup_misses",
] as const;

const WRITE_KEYWORDS =
	/\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma|vacuum|reindex|begin|commit|rollback)\b/i;

/**
 * Ô truy vấn trong trang quản trị chỉ cho phép đọc.
 *
 * Một câu lệnh ghi gõ nhầm ở đây có thể xoá sạch dữ liệu mà không hoàn tác được,
 * và nếu tài khoản quản trị bị chiếm thì nó thành cửa mở toang. Muốn sửa dữ
 * liệu thì dùng các nút bảo trì có sẵn, vì chúng biết phải dọn cả ảnh trong kho.
 */
export function readOnlySql(raw: string): string | null {
	const sql = raw.trim().replace(/;+\s*$/, "");
	if (!sql) return null;
	if (!/^(select|with)\b/i.test(sql)) return null;
	if (sql.includes(";")) return null;
	if (WRITE_KEYWORDS.test(sql)) return null;
	return /\blimit\b/i.test(sql) ? sql : `${sql} LIMIT 200`;
}

/**
 * Ký tự mà Excel và Google Sheets hiểu là "ô này là công thức".
 *
 * Tên và mô tả trong file CSV do người lạ gõ vào. Một ô bắt đầu bằng `=` là một
 * công thức chạy ngay khi bạn mở file, kể cả `=HYPERLINK(...)` dẫn đi đâu đó.
 * Thêm dấu nháy đơn ở đầu thì bảng tính coi nó là chữ, và dấu nháy đó không
 * hiện ra trong ô.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
	const raw = String(value ?? "");
	const text = FORMULA_LEAD.test(raw) ? `'${raw}` : raw;
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
