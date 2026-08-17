/**
 * Mã có dạng TA- kèm 8 chữ số, sinh ngẫu nhiên chứ không chạy theo thứ tự.
 *
 * Mã chính là chìa khoá xem bài, nên độ dài là chuyện bảo mật: 8 chữ số cho
 * 100 triệu tổ hợp, đủ để việc dò mã hàng loạt trở nên vô nghĩa. Sáu chữ số chỉ
 * có 1 triệu tổ hợp, quét hết trong một buổi.
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

/**
 * Gom một địa chỉ về đúng đơn vị đáng đếm.
 *
 * Băm nguyên chuỗi IP nghe thì chặt chẽ, nhưng với IPv6 nó hỏng theo cả hai
 * hướng cùng lúc. Mỗi thuê bao IPv6 được cấp cả một dải `/64` (khoảng 18 tỷ tỷ
 * địa chỉ), nên người muốn dò chỉ cần đổi sang địa chỉ khác trong dải của chính
 * mình là có danh tính mới tinh, và mọi trần đếm theo IP thành vô nghĩa. Trong
 * khi đó người dùng IPv4 sau CGNAT lại chịu điều ngược lại: hàng trăm thuê bao
 * chung một địa chỉ, chung luôn một suất.
 *
 * Cắt về `/64` sửa đúng cả hai: một thuê bao IPv6 vốn là một `/64`, nên người
 * dùng thật không thấy gì khác, còn kẻ dò thì hết chỗ nhảy. IPv4 giữ nguyên.
 */
export function ipIdentity(ip: string): string {
	if (!ip.includes(":")) return ip;

	// `::` viết tắt cho một dãy nhóm 0 nên phải bung ra trước khi cắt, nếu không
	// `2001:db8::1` và `2001:db8:0:0::1` lại ra hai danh tính khác nhau.
	const [head, tail = ""] = ip.split("::");
	const left = head ? head.split(":") : [];
	const right = tail ? tail.split(":") : [];
	const groups = ip.includes("::")
		? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right]
		: ip.split(":");

	// `/64` là bốn nhóm đầu. Bỏ số 0 thừa để mọi cách viết cùng ra một chuỗi.
	return groups
		.slice(0, 4)
		.map((group) => (group.replace(/^0+/, "") || "0").toLowerCase())
		.join(":");
}

/** Không bao giờ lưu IP thô, chỉ lưu bản băm có muối để đếm và chặn lạm dụng. */
export async function hashIp(ip: string, salt: string): Promise<string> {
	return (await sha256Hex(`${ipIdentity(ip)}:${salt}`)).slice(0, 32);
}

export function clientIp(req: Request): string {
	return req.headers.get("cf-connecting-ip") ?? "0.0.0.0";
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

/**
 * Yêu cầu có đến từ máy lập trình hay không.
 *
 * Dùng để nới lỏng vài thứ khi chạy local (bỏ qua captcha, mở cửa sau vào
 * /admin) mà vẫn siết chặt trên production. Suy ra từ hostname của chính yêu
 * cầu, không phải từ biến môi trường. Biến có thể bị đặt nhầm, hostname thì
 * không giả được.
 */
export function isLocalRequest(url: string): boolean {
	try {
		return LOCAL_HOSTS.has(new URL(url).hostname);
	} catch {
		return false;
	}
}

/** Cookie do nút "Xem như production" trong /admin đặt, để tắt mọi nới lỏng. */
export const DEV_MODE_COOKIE = "tuanai_devmode";

/**
 * Yêu cầu này có được hưởng các nới lỏng của chế độ phát triển hay không.
 *
 * Chạy local thì mọi yêu cầu đều mang cùng một địa chỉ mạng giả (`0.0.0.0`, xem
 * `clientIp`), nên các ngưỡng tính theo người dùng chặn ngay chính người đang
 * ngồi test: gửi ba bài thử là trang khoá cho tới nửa đêm UTC.
 *
 * Nút "Xem như production" trong /admin đặt cookie tắt cửa này, để kiểm tra
 * đúng những gì người lạ gặp mà không cần deploy.
 */
export function devRelaxed(url: string, cookies: string): boolean {
	if (!isLocalRequest(url)) return false;
	return !cookies.includes(`${DEV_MODE_COOKIE}=prod`);
}

/** Ngày UTC, trùng với mốc reset hạn mức KV của Cloudflare. */
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

/**
 * Bài gửi đã đủ để duyệt tay hay chưa.
 *
 * Người gửi phải nói được *điều gì đó* về mong muốn của mình, nhưng chạm một
 * cái kiểu ("Để Tuân AI tự quyết") cũng đã là nói rồi. Phần lớn người đến đây chỉ
 * có mỗi tấm ảnh và chưa hình dung ra clip sẽ thế nào; bắt viết mô tả bằng mọi
 * giá là chỗ họ bỏ cuộc.
 *
 * Giao diện gửi bài khoá nút gửi theo đúng luật này. Ở đây là chốt chặn thật,
 * kiểm tra phía trình duyệt chỉ là phép lịch sự, ai cũng bỏ qua được.
 */
export function hasEnoughToSubmit(
	nickname: string,
	description: string,
	styles: string[],
): boolean {
	return Boolean(nickname) && (Boolean(description) || styles.length > 0);
}
