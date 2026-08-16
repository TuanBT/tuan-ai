import { Hono } from "hono";
import { normalizeCode, isCode } from "../lib/util";

/**
 * Danh sách User-Agent của các bot crawler cần thấy OG meta tags.
 *
 * Khi ai đó dán link `tuanai.com/r/TA-12345678` lên Zalo, Facebook, Telegram…,
 * con bot của nền tảng đó sẽ gọi URL để đọc thẻ `og:image`, `og:title`.
 * SPA trả về `<div id="root"></div>` trống — bot không chạy JS nên không thấy gì.
 *
 * Route này chặn trước: nếu User-Agent khớp bot thì trả HTML tĩnh có đủ OG,
 * nếu không thì bỏ qua, để Cloudflare Assets trả `index.html` bình thường.
 */
const BOT_UA_PATTERN =
	/facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|WhatsApp|Zalobot|viettelbot|Googlebot|Google-Safety|Google-APIs-Explorer|Google-InspectionTool|bingbot|yandex|Pinterestbot|Applebot|redditbot/i;

function isBot(userAgent: string | null | undefined): boolean {
	if (!userAgent) return false;
	return BOT_UA_PATTERN.test(userAgent);
}

/** Thoát ký tự HTML để tránh XSS từ dữ liệu DB. */
function esc(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function ogRoutes() {
	const app = new Hono<{ Bindings: Env }>();

	app.get("/r/:code", async (c, next) => {
		const ua = c.req.header("user-agent");

		// Người dùng bình thường: bỏ qua, để Cloudflare Assets phục vụ SPA.
		if (!isBot(ua)) return next();

		const code = normalizeCode(c.req.param("code"));
		if (!isCode(code)) return next();

		const row = await c.env.DB.prepare(
			`SELECT code, nickname, description, images_purged
			 FROM submissions WHERE code = ?`,
		)
			.bind(code)
			.first<{
				code: string;
				nickname: string;
				description: string;
				images_purged: number;
			}>();

		// Bài không tồn tại: để SPA hiện lỗi "not found" bình thường.
		if (!row) return next();

		const origin = new URL(c.req.url).origin;
		const pageUrl = `${origin}/r/${row.code}`;
		const imageUrl = row.images_purged ? null : `${origin}/i/${row.code}/0`;

		const title = esc(row.nickname ? `${row.nickname} · Tuân AI` : "Tuân AI");
		const description = esc(
			row.description
				? row.description.slice(0, 200)
				: "Cho đồ vật vô tri sống dậy.",
		);

		const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<meta name="description" content="${description}">

<!-- Open Graph -->
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${esc(pageUrl)}">
${imageUrl ? `<meta property="og:image" content="${esc(imageUrl)}">` : ""}

<!-- Twitter Card -->
<meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
${imageUrl ? `<meta name="twitter:image" content="${esc(imageUrl)}">` : ""}

<!-- Redirect người dùng thật (nếu bot nào đó có JS) về trang SPA -->
<meta http-equiv="refresh" content="0;url=${esc(pageUrl)}">
</head>
<body>
<p><a href="${esc(pageUrl)}">${title}</a></p>
</body>
</html>`;

		return c.html(html);
	});

	return app;
}
