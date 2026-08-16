import type { MiddlewareHandler } from "hono";

/**
 * Chính sách nội dung của trang.
 *
 * `challenges.cloudflare.com` xuất hiện hai lần vì Turnstile vừa nạp script vừa
 * dựng một iframe. Còn `'unsafe-inline'` cho style là do React đặt thuộc tính
 * `style` thẳng vào thẻ — bỏ nó đi thì trang vỡ giao diện chứ không an toàn
 * hơn, vì kịch bản tấn công đáng lo ở đây là script chứ không phải màu chữ.
 */
const CSP = [
	"default-src 'self'",
	"script-src 'self' https://challenges.cloudflare.com",
	"frame-src https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"connect-src 'self'",
	"font-src 'self'",
	"object-src 'none'",
	"base-uri 'none'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join("; ");

/**
 * Cùng bộ header với `public/_headers` (file đó lo phần trang tĩnh, vốn được
 * phục vụ thẳng từ biên chứ không đi qua Worker). Giữ hai nơi khớp nhau.
 */
export const SECURITY_HEADERS: Record<string, string> = {
	"Content-Security-Policy": CSP,
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"X-Frame-Options": "DENY",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

export const securityHeaders: MiddlewareHandler = async (c, next) => {
	await next();
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		// Route ảnh tự đặt Content-Type và cache riêng; không ghi đè thứ nó đã có.
		if (!c.res.headers.has(name)) c.res.headers.set(name, value);
	}
};
