const VERIFY_URL =
	"https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Kiểm tra captcha với Cloudflare.
 *
 * Hàm này đòi `secret` là bắt buộc. Trước đây nó tự cho qua khi thiếu secret,
 * nghĩa là quên nạp `TURNSTILE_SECRET` trên production là form mở toang cho bot
 * mà không có dấu hiệu nào. Việc quyết định "thiếu secret thì làm gì" nay nằm ở
 * phía route: bỏ qua khi chạy local, từ chối nhận bài khi chạy thật.
 */
export async function verifyTurnstile(
	token: string | null,
	secret: string,
	ip: string,
): Promise<boolean> {
	if (!token) return false;

	const form = new FormData();
	form.append("secret", secret);
	form.append("response", token);
	form.append("remoteip", ip);

	try {
		const res = await fetch(VERIFY_URL, { method: "POST", body: form });
		const data = (await res.json()) as { success?: boolean };
		return data.success === true;
	} catch {
		return false;
	}
}

/**
 * Chưa cấu hình captcha thì chỉ máy lập trình mới được nhận bài.
 */
export function turnstileReady(
	secret: string | undefined,
	local: boolean,
): boolean {
	return Boolean(secret) || local;
}
