const VERIFY_URL =
	"https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Khi chưa cấu hình TURNSTILE_SECRET (ví dụ lúc chạy local), bỏ qua bước kiểm
 * tra để còn phát triển được. Trên production thì thiếu khoá đồng nghĩa với
 * việc form mở toang, nên /api/config sẽ cảnh báo trong trang quản trị.
 */
export async function verifyTurnstile(
	token: string | null,
	secret: string | undefined,
	ip: string,
): Promise<boolean> {
	if (!secret) return true;
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
