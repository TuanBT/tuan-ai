/**
 * Mã có dạng TA- kèm 8 chữ số, sinh ngẫu nhiên chứ không chạy theo thứ tự.
 *
 * Mã chính là chìa khoá xem bài, nên độ dài là chuyện bảo mật: 8 chữ số cho
 * 100 triệu tổ hợp, đủ để việc dò mã hàng loạt trở nên vô nghĩa. Sáu chữ số chỉ
 * có 1 triệu tổ hợp — quét hết trong một buổi.
 *
 * Chạy theo thứ tự thì còn tệ hơn: biết một mã là đoán được mã kế bên.
 */
const CODE_DIGITS = 8;

export function newCode(): string {
	const max = 10 ** CODE_DIGITS;
	// Lấy ngẫu nhiên theo kiểu loại bỏ phần dư, để mọi mã có xác suất bằng nhau.
	const limit = Math.floor(0xffffffff / max) * max;
	let value: number;
	do {
		value = crypto.getRandomValues(new Uint32Array(1))[0];
	} while (value >= limit);

	return `TA-${String(value % max).padStart(CODE_DIGITS, "0")}`;
}

export function isCode(value: string): boolean {
	return new RegExp(`^TA-\\d{${CODE_DIGITS}}$`).test(value);
}

/** Chấp nhận "12345678", "ta-12345678", "TA 12345678" → "TA-12345678". */
export function normalizeCode(input: string): string {
	const digits = input.replace(/\D/g, "");
	return digits.length === CODE_DIGITS ? `TA-${digits}` : input.toUpperCase();
}

export async function sha256Hex(input: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(input),
	);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** Không bao giờ lưu IP thô — chỉ lưu bản băm có muối để đếm và chặn lạm dụng. */
export async function hashIp(ip: string, salt: string): Promise<string> {
	return (await sha256Hex(`${ip}:${salt}`)).slice(0, 32);
}

export function clientIp(req: Request): string {
	return req.headers.get("cf-connecting-ip") ?? "0.0.0.0";
}

/** Ngày UTC — trùng với mốc reset hạn mức KV của Cloudflare. */
export function utcDay(at: Date = new Date()): string {
	return at.toISOString().slice(0, 10);
}

export function secondsUntilUtcMidnight(at: Date = new Date()): number {
	const next = Date.UTC(
		at.getUTCFullYear(),
		at.getUTCMonth(),
		at.getUTCDate() + 1,
	);
	return Math.max(1, Math.floor((next - at.getTime()) / 1000));
}

export function b64urlEncode(bytes: Uint8Array): string {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(text: string): Uint8Array {
	const padded = text.replace(/-/g, "+").replace(/_/g, "/");
	const bin = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
	return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

/** So sánh chuỗi trong thời gian không đổi, tránh rò rỉ qua đo thời gian. */
export function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export function clampText(value: unknown, max: number): string {
	return typeof value === "string" ? value.trim().slice(0, max) : "";
}
