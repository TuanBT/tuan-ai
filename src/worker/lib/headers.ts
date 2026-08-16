import type { MiddlewareHandler } from "hono";

/** Turnstile cần đủ ba chỗ này, thiếu một là ô chống bot chết. */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/**
 * Chính sách nội dung của trang.
 *
 * `challenges.cloudflare.com` phải có mặt ở **ba** directive, không phải hai:
 * `script-src` để nạp api.js, `frame-src` cho iframe nó dựng lên, và
 * `connect-src` cho những lượt gọi mạng nó tự thực hiện từ trang cha. Thiếu
 * `connect-src` thì script tải về được, iframe hiện ra được, nhưng ô kiểm tra
 * báo không kết nối được, hỏng theo kiểu nhìn qua tưởng lỗi mạng.
 *
 * Còn `'unsafe-inline'` cho style là do React đặt thuộc tính `style` thẳng vào
 * thẻ, bỏ nó đi thì trang vỡ giao diện chứ không an toàn hơn, vì kịch bản tấn
 * công đáng lo ở đây là script chứ không phải màu chữ.
 */
const CSP = [
	"default-src 'self'",
	`script-src 'self' ${TURNSTILE_ORIGIN}`,
	`frame-src ${TURNSTILE_ORIGIN}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	`connect-src 'self' ${TURNSTILE_ORIGIN}`,
	"font-src 'self'",
	"object-src 'none'",
	"base-uri 'none'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join("; ");

/** Xuất ra để test so khớp với `public/_headers`. */
export const CSP_VALUE = CSP;

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
