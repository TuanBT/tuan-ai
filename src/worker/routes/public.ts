import { Hono, type MiddlewareHandler } from "hono";
import { requireAdmin } from "./auth";
import { blobs, imageKey } from "../lib/storage";
import {
	bumpUsage,
	parseUsage,
	remainingWrites,
	usageToday,
	USAGE_TODAY_QUERY,
	type DailyUsage,
} from "../lib/quota";
import { parseSettings, readSettings, SETTINGS_QUERY } from "../lib/settings";
import { turnstileReady, verifyTurnstile } from "../lib/turnstile";
import {
	clampText,
	clientIp,
	devRelaxed,
	hasEnoughToSubmit,
	hashIp,
	isCode,
	isLocalRequest,
	newCode,
	normalizeCode,
	secondsUntilUtcMidnight,
	utcDay,
} from "../lib/util";

const MAX_IMAGE_BYTES = 1_500_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Số lần tra trượt tối đa mỗi người mỗi ngày, để không ai dò mã hàng loạt. */
const MAX_LOOKUP_MISSES = 30;

interface ImageMeta {
	key: string;
	type: string;
	size: number;
}

/**
 * Bộ đếm chặn dò mã, dùng chung cho cả tra cứu lẫn đường lấy ảnh.
 *
 * Phải hỏi *trước* khi trả lời, chứ không phải đếm sau: đếm sau thì người đã
 * vượt ngưỡng vẫn dò tiếp được, đoán trúng là vẫn được phục vụ, và cái gọi là
 * giới hạn thành ra không giới hạn gì cả.
 */
async function overLookupLimit(
	db: D1Database,
	ipHash: string,
	day: string,
): Promise<boolean> {
	const seen = await db
		.prepare("SELECT misses FROM lookup_misses WHERE ip_hash = ? AND day = ?")
		.bind(ipHash, day)
		.first<{ misses: number }>();
	return (seen?.misses ?? 0) >= MAX_LOOKUP_MISSES;
}

async function noteLookupMiss(
	db: D1Database,
	ipHash: string,
	day: string,
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO lookup_misses (ip_hash, day, misses) VALUES (?1, ?2, 1)
			 ON CONFLICT(ip_hash, day) DO UPDATE SET misses = misses + 1`,
		)
		.bind(ipHash, day)
		.run();
}

export function publicRoutes() {
	const app = new Hono<{ Bindings: Env }>();

	/**
	 * Hàng rào bảo trì cho những đường công khai có đụng tới dữ liệu bài gửi.
	 *
	 * Giấu form ở phía giao diện thôi là chưa đủ: lúc đang sửa dữ liệu, ai gọi
	 * thẳng API vẫn gửi được bài mới vào giữa chừng. Chặn ở đây thì mới thật sự
	 * là dừng.
	 *
	 * `/api/config` cố ý không nằm sau hàng rào — chính nó là thứ nói cho trang
	 * biết đang bảo trì để dựng màn hình thông báo. `/i/*` cũng không: đó chỉ là
	 * mấy byte ảnh, mà thêm một lượt đọc D1 vào từng tấm ảnh thì lúc bình thường
	 * cả trang phải trả giá cho một cái công tắc gần như luôn tắt.
	 */
	const maintenanceGate: MiddlewareHandler<{ Bindings: Env }> = async (
		c,
		next,
	) => {
		const settings = await readSettings(c.env.DB);
		if (!settings.maintenance_mode) return next();
		// Chủ trang vẫn đi lại bình thường: đóng cửa để sửa mà chính mình cũng
		// không vào xem được thì chỉ còn cách mở lại rồi mới biết đã sửa xong chưa.
		if (await requireAdmin(c)) return next();
		return c.json({ error: "maintenance" }, 503);
	};

	app.use("/api/gallery", maintenanceGate);
	app.use("/api/s/*", maintenanceGate);
	app.use("/api/submit", maintenanceGate);

	app.get("/api/config", async (c) => {
		// Ba câu này trước đây chạy nối tiếp nhau ở mỗi lượt tải trang.
		const [settingsRows, usageRow, styleRows] = await c.env.DB.batch([
			c.env.DB.prepare(SETTINGS_QUERY),
			c.env.DB.prepare(USAGE_TODAY_QUERY).bind(utcDay()),
			c.env.DB.prepare(
				"SELECT id, label_vi, label_en FROM styles WHERE active = 1 ORDER BY sort_order, id",
			),
		]);

		const settings = parseSettings(
			settingsRows.results as Array<{ key: string; value: string }>,
		);
		const usage = parseUsage(
			(usageRow.results as DailyUsage[])[0],
		);
		const left = remainingWrites(usage, settings.daily_write_budget);
		const captchaReady = turnstileReady(
			c.env.TURNSTILE_SECRET,
			isLocalRequest(c.req.url),
		);

		// Chỉ kiểm tra phiên quản trị khi đang bảo trì: lúc trang mở bình thường
		// thì mọi lượt tải đều khỏi tốn một lần xác thực chữ ký cookie.
		const bypass = settings.maintenance_mode && (await requireAdmin(c));

		return c.json({
			siteTitle: settings.site_title,
			tagline: { vi: settings.tagline_vi, en: settings.tagline_en },
			channels: {
				tiktok: settings.tiktok_url || null,
				youtube: settings.youtube_url || null,
			},
			styles: styleRows.results,
			maxImages: settings.max_images,
			retentionDays: settings.retention_days,
			turnstileSiteKey: c.env.TURNSTILE_SITE_KEY ?? null,
			maintenance: settings.maintenance_mode,
			// Chủ trang đang xem trong lúc bảo trì: trang vẫn chạy đủ, chỉ thêm một
			// dải nhắc để không quên rằng người khác đang thấy hàng rào.
			maintenanceBypass: bypass,
			maintenanceNote: settings.maintenance_note,
			// Chủ trang đi qua được hàng rào thì form cũng phải mở với họ: xem được
			// mà không thử gửi được một bài thì chưa gọi là kiểm tra xong.
			open:
				(!settings.maintenance_mode || bypass) &&
				captchaReady &&
				settings.submissions_open &&
				left >= 1,
			// Bảo trì xếp trước cả thiếu captcha: đang sửa chữa thì mọi lý do khác
			// đều chưa tới lượt. Rồi mới tới thiếu captcha — đó là lỗi cấu hình của
			// chủ trang, và người dùng nên thấy lời xin lỗi tử tế thay vì điền xong
			// cả form rồi mới ăn lỗi lúc bấm gửi.
			closedReason: settings.maintenance_mode && !bypass
				? "maintenance"
				: !captchaReady
					? "setup"
					: !settings.submissions_open
						? "paused"
						: left < 1
							? "quota"
							: null,
			resetInSeconds: secondsUntilUtcMidnight(),
		});
	});

	app.get("/api/gallery", async (c) => {
		// Đăng ở đâu cũng là đã lên sóng; ô trong thư viện dẫn sang TikTok trước,
		// vì kênh chính nằm ở đó, thiếu thì mới sang YouTube.
		const rows = await c.env.DB.prepare(
			`SELECT code, nickname, created_at, published_tiktok, published_youtube, images_purged
			 FROM submissions
			 WHERE status = 'done'
			   AND (IFNULL(published_tiktok, '') <> '' OR IFNULL(published_youtube, '') <> '')
			 ORDER BY created_at DESC LIMIT 12`,
		).all<{
			code: string;
			nickname: string;
			created_at: number;
			published_tiktok: string | null;
			published_youtube: string | null;
			images_purged: number;
		}>();

		return c.json({
			// Không trả `code` ra ngoài: mã là chìa khoá xem bài, không phải dữ liệu
			// hiển thị. (Mã của bài đã lên sóng vẫn đoán được từ đường dẫn ảnh bên
			// dưới, chấp nhận được, vì nội dung đó đã công khai trên kênh rồi.)
			items: rows.results.map((row) => ({
				nickname: row.nickname,
				// Ngày người gửi đặt hàng, không phải ngày clip lên kênh: bảng chỉ ghi
				// lúc bài được tạo. Ô trong thư viện vì thế nói "gửi ngày", để không
				// hứa một mốc mà dữ liệu không có.
				createdAt: row.created_at,
				publishedTiktok: row.published_tiktok || null,
				publishedYoutube: row.published_youtube || null,
				thumb: row.images_purged ? null : `/i/${row.code}/0`,
			})),
		});
	});

	app.get("/api/s/:code", async (c) => {
		const code = normalizeCode(c.req.param("code"));
		if (!isCode(code)) return c.json({ error: "invalid_code" }, 400);

		const ipHash = await hashIp(clientIp(c.req.raw), c.env.SESSION_SECRET);
		const day = utcDay();

		if (await overLookupLimit(c.env.DB, ipHash, day)) {
			return c.json({ error: "too_many_lookups" }, 429);
		}

		const row = await c.env.DB.prepare(
			`SELECT code, nickname, description, styles, images, status,
			        published_tiktok, published_youtube, reject_reason,
			        created_at, expires_at, images_purged
			 FROM submissions WHERE code = ?`,
		)
			.bind(code)
			.first<{
				code: string;
				nickname: string;
				description: string;
				styles: string;
				images: string;
				status: string;
				published_tiktok: string | null;
				published_youtube: string | null;
				reject_reason: string | null;
				created_at: number;
				expires_at: number;
				images_purged: number;
			}>();

		if (!row) {
			await noteLookupMiss(c.env.DB, ipHash, day);
			return c.json({ error: "not_found" }, 404);
		}

		const images = JSON.parse(row.images) as ImageMeta[];
		return c.json({
			code: row.code,
			nickname: row.nickname,
			description: row.description,
			styles: JSON.parse(row.styles) as string[],
			status: row.status,
			publishedTiktok: row.published_tiktok,
			publishedYoutube: row.published_youtube,
			// Chỉ trả lý do khi bài đang bị bỏ qua. Chủ trang có thể gõ lý do rồi đổi
			// ý chọn lại bài; câu đó không nên đi theo bài sang trạng thái mới.
			rejectReason: row.status === "rejected" ? row.reject_reason : null,
			createdAt: row.created_at,
			expiresAt: row.expires_at,
			imageUrls: row.images_purged
				? []
				: images.map((_, index) => `/i/${row.code}/${index}`),
		});
	});

	app.get("/i/:code/:index", async (c) => {
		const code = normalizeCode(c.req.param("code"));
		const index = Number(c.req.param("index"));
		if (!isCode(code) || !Number.isInteger(index) || index < 0 || index > 9) {
			return c.notFound();
		}

		const ipHash = await hashIp(clientIp(c.req.raw), c.env.SESSION_SECRET);
		const day = utcDay();

		/*
		 * Đường lấy ảnh trước đây không bị đếm lượt dò, dù ảnh mới là thứ đáng giá.
		 * Bộ đếm chỉ gắn ở /api/s. Chạy song song hai việc để không phải trả thêm
		 * một vòng chờ D1 cho mỗi tấm ảnh hiển thị bình thường; nếu quá ngưỡng thì
		 * kết quả KV bị vứt đi chứ không bao giờ được gửi ra.
		 */
		const [blocked, found] = await Promise.all([
			overLookupLimit(c.env.DB, ipHash, day),
			blobs(c.env).get(imageKey(code, index)),
		]);

		if (blocked) return c.text("", 429);
		if (!found) {
			await noteLookupMiss(c.env.DB, ipHash, day);
			return c.notFound();
		}

		return new Response(found.data, {
			headers: {
				"Content-Type": found.contentType,
				// Chỉ cho trình duyệt của người xem lưu tạm, không cache ở biên,
				// để khi xoá một bài thì ảnh biến mất gần như ngay.
				"Cache-Control": "private, max-age=300",
				"X-Content-Type-Options": "nosniff",
			},
		});
	});

	app.post("/api/submit", async (c) => {
		const settings = await readSettings(c.env.DB);
		const ip = clientIp(c.req.raw);
		const secret = c.env.TURNSTILE_SECRET;

		/*
		 * Thiếu captcha thì đóng form lại, đừng nhận bài.
		 *
		 * Trước đây hàm kiểm tra tự trả về "đạt" khi không có secret. Tiện lúc
		 * chạy local, nhưng nghĩa là chỉ cần quên một lệnh `wrangler secret put`
		 * là form mở toang cho bot mà không có gì báo ngoài một dòng chữ trong
		 * trang Thống kê. Mất bài còn hơn mất trắng vì bot.
		 */
		if (!turnstileReady(secret, isLocalRequest(c.req.url))) {
			return c.json({ error: "turnstile_unconfigured" }, 503);
		}

		if (!settings.submissions_open) {
			return c.json({ error: "paused" }, 503);
		}

		let form: FormData;
		try {
			form = await c.req.formData();
		} catch {
			return c.json({ error: "bad_form" }, 400);
		}

		const files = form
			.getAll("images")
			.filter((entry): entry is File => entry instanceof File);

		if (files.length < 1 || files.length > settings.max_images) {
			return c.json({ error: "image_count" }, 400);
		}
		for (const file of files) {
			if (!ALLOWED_TYPES.has(file.type)) {
				return c.json({ error: "image_type" }, 400);
			}
			if (file.size > MAX_IMAGE_BYTES || file.size === 0) {
				return c.json({ error: "image_size" }, 400);
			}
		}

		// Kiểm tra hạn mức ngay trước khi ghi, vì mỗi ảnh tốn một lượt ghi KV.
		const usage = await usageToday(c.env.DB);
		const left = remainingWrites(usage, settings.daily_write_budget);
		if (left < files.length) {
			await bumpUsage(c.env.DB, { blocked: 1 });
			return c.json(
				{ error: "quota", resetInSeconds: secondsUntilUtcMidnight() },
				429,
			);
		}

		if (secret) {
			const ok = await verifyTurnstile(
				form.get("turnstile") as string | null,
				secret,
				ip,
			);
			if (!ok) return c.json({ error: "turnstile" }, 400);
		}

		const nickname = clampText(form.get("nickname"), 60);
		const description = clampText(form.get("description"), 500);
		const email = clampText(form.get("email"), 120);
		const lang = form.get("lang") === "en" ? "en" : "vi";

		let styles: string[] = [];
		try {
			const parsed = JSON.parse(clampText(form.get("styles"), 300) || "[]");
			if (Array.isArray(parsed)) styles = parsed.slice(0, 5).map(String);
		} catch {
			styles = [];
		}

		if (!hasEnoughToSubmit(nickname, description, styles)) {
			return c.json({ error: "missing_fields" }, 400);
		}
		if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
			return c.json({ error: "bad_email" }, 400);
		}

		const ipHash = await hashIp(ip, c.env.SESSION_SECRET);

		/*
		 * Hạn mức mỗi người mỗi ngày, bỏ qua khi đang chạy trên máy lập trình.
		 *
		 * Local không có `cf-connecting-ip` nên mọi lượt gửi đều chung một mã băm:
		 * gửi vài bài thử là tự khoá chính mình tới nửa đêm UTC, mà cách gỡ duy
		 * nhất là vào tận cơ sở dữ liệu xoá bài. Muốn thử đúng cái chặn này thì
		 * bấm "Xem như production" trong /admin.
		 */
		if (!devRelaxed(c.req.url, c.req.header("cookie") ?? "")) {
			const sinceMidnight =
				Math.floor(Date.parse(`${utcDay()}T00:00:00Z`) / 1000) * 1000;
			const fromThisIp = await c.env.DB.prepare(
				"SELECT COUNT(*) AS n FROM submissions WHERE ip_hash = ? AND created_at >= ?",
			)
				.bind(ipHash, sinceMidnight)
				.first<{ n: number }>();

			if ((fromThisIp?.n ?? 0) >= settings.max_per_ip_day) {
				return c.json(
					{ error: "ip_limit", resetInSeconds: secondsUntilUtcMidnight() },
					429,
				);
			}
		}

		const code = newCode();
		const now = Date.now();
		const ttlSeconds = settings.retention_days * 86_400;
		const store = blobs(c.env);
		const meta: ImageMeta[] = [];
		let bytes = 0;

		for (const [index, file] of files.entries()) {
			const key = imageKey(code, index);
			await store.put(key, await file.arrayBuffer(), file.type, ttlSeconds);
			meta.push({ key, type: file.type, size: file.size });
			bytes += file.size;
		}

		await c.env.DB.prepare(
			`INSERT INTO submissions
			   (code, nickname, email, description, styles, images, lang, bytes,
			    ip_hash, created_at, expires_at)
			 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
		)
			.bind(
				code,
				nickname,
				email || null,
				description,
				JSON.stringify(styles),
				JSON.stringify(meta),
				lang,
				bytes,
				ipHash,
				now,
				now + ttlSeconds * 1000,
			)
			.run();

		await bumpUsage(c.env.DB, {
			submissions: 1,
			kv_writes: files.length,
			bytes,
		});

		return c.json({ code });
	});

	return app;
}
