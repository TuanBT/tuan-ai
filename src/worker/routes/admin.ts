import { Hono } from "hono";
import { requireAdmin } from "./auth";
import { blobs } from "../lib/storage";
import { remainingWrites, usageToday } from "../lib/quota";
import { readSettings, writeSettings } from "../lib/settings";
import { purgeExpired } from "../lib/purge";
import { clampText, isCode, utcDay } from "../lib/util";

const STATUSES = new Set(["new", "selected", "done", "rejected"]);
const KV_FREE_DAILY_WRITES = 1000;
const KV_FREE_BYTES = 1024 ** 3;

interface SubmissionRow {
	code: string;
	nickname: string;
	email: string | null;
	description: string;
	styles: string;
	images: string;
	status: string;
	published_url: string | null;
	admin_note: string | null;
	lang: string;
	bytes: number;
	created_at: number;
	expires_at: number;
	images_purged: number;
}

export function adminRoutes() {
	const app = new Hono<{ Bindings: Env }>();

	app.use("/api/admin/*", async (c, next) => {
		if (!(await requireAdmin(c))) return c.json({ error: "unauthorized" }, 401);
		await next();
	});

	app.get("/api/admin/submissions", async (c) => {
		const status = c.req.query("status") ?? "";
		const limit = Math.min(Number(c.req.query("limit")) || 40, 100);
		const before = Number(c.req.query("before")) || Date.now() + 1;

		const filtered = STATUSES.has(status);
		const rows = await c.env.DB.prepare(
			`SELECT * FROM submissions
			 WHERE created_at < ?1 ${filtered ? "AND status = ?3" : ""}
			 ORDER BY created_at DESC LIMIT ?2`,
		)
			.bind(...(filtered ? [before, limit, status] : [before, limit]))
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
				publishedUrl: row.published_url,
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

	app.patch("/api/admin/submissions/:code", async (c) => {
		const code = c.req.param("code").toUpperCase();
		if (!isCode(code)) return c.json({ error: "invalid_code" }, 400);

		const body = (await c.req.json()) as Record<string, unknown>;
		const sets: string[] = [];
		const values: unknown[] = [];

		if (typeof body.status === "string" && STATUSES.has(body.status)) {
			sets.push("status = ?");
			values.push(body.status);
		}
		if ("publishedUrl" in body) {
			const url = clampText(body.publishedUrl, 500);
			if (url && !/^https:\/\//.test(url)) {
				return c.json({ error: "bad_url" }, 400);
			}
			sets.push("published_url = ?");
			values.push(url || null);
		}
		if ("adminNote" in body) {
			sets.push("admin_note = ?");
			values.push(clampText(body.adminNote, 1000) || null);
		}
		if (!sets.length) return c.json({ error: "nothing_to_update" }, 400);

		values.push(code);
		await c.env.DB.prepare(
			`UPDATE submissions SET ${sets.join(", ")} WHERE code = ?`,
		)
			.bind(...values)
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

		const pending = await c.env.DB.prepare(
			`SELECT COUNT(*) AS n FROM submissions
			 WHERE images_purged = 0 AND MIN(expires_at, created_at + ?1) <= ?2`,
		)
			.bind((await readSettings(c.env.DB)).retention_days * 86_400_000, Date.now())
			.first<{ n: number }>();

		return c.json({
			tables: TABLES.map((table, index) => ({
				name: table,
				rows: counts[index].results[0]?.n ?? 0,
			})),
			duePurge: pending?.n ?? 0,
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

	app.post("/api/admin/purge", async (c) => {
		return c.json({ purged: await purgeExpired(c.env) });
	});

	app.get("/api/admin/export.csv", async (c) => {
		const rows = await c.env.DB.prepare(
			`SELECT code, nickname, email, description, styles, status,
			        published_url, admin_note, lang, bytes, created_at
			 FROM submissions ORDER BY created_at DESC`,
		).all<Record<string, unknown>>();

		const header = [
			"ma",
			"ten",
			"email",
			"mo_ta",
			"kieu",
			"trang_thai",
			"link_da_dang",
			"ghi_chu",
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
				row.published_url ?? "",
				row.admin_note ?? "",
				row.lang,
				row.bytes,
				new Date(Number(row.created_at)).toISOString(),
			]
				.map(csvCell)
				.join(","),
		);

		// BOM để Excel mở tiếng Việt không bị vỡ dấu.
		const csv = `﻿${[header.join(","), ...body].join("\r\n")}`;
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
 * liệu thì dùng các nút bảo trì có sẵn — chúng biết phải dọn cả ảnh trong kho.
 */
function readOnlySql(raw: string): string | null {
	const sql = raw.trim().replace(/;+\s*$/, "");
	if (!sql) return null;
	if (!/^(select|with)\b/i.test(sql)) return null;
	if (sql.includes(";")) return null;
	if (WRITE_KEYWORDS.test(sql)) return null;
	return /\blimit\b/i.test(sql) ? sql : `${sql} LIMIT 200`;
}

function csvCell(value: unknown): string {
	const text = String(value ?? "");
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
