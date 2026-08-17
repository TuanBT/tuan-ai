import { describe, expect, it } from "vitest";
import {
	b64urlDecode,
	b64urlEncode,
	clampText,
	devRelaxed,
	hasEnoughToSubmit,
	hashIp,
	ipIdentity,
	isCode,
	isLocalRequest,
	newCode,
	normalizeCode,
	secondsUntilUtcMidnight,
	timingSafeEqual,
	utcDay,
} from "../src/worker/lib/util";

describe("mã bài", () => {
	it("sinh đúng dạng TA- kèm 8 chữ số", () => {
		for (let i = 0; i < 200; i++) {
			expect(isCode(newCode())).toBe(true);
		}
	});

	it("không lặp lại trong 500 lần sinh liên tiếp", () => {
		const seen = new Set<string>();
		for (let i = 0; i < 500; i++) seen.add(newCode());
		expect(seen.size).toBe(500);
	});

	it("từ chối mọi thứ không đúng dạng", () => {
		for (const bad of [
			"TA-1234567",
			"TA-123456789",
			"ta-12345678",
			"TA12345678",
			"12345678",
			"TA-1234567a",
			"",
		]) {
			expect(isCode(bad)).toBe(false);
		}
	});

	it("chuẩn hoá được các cách người dùng hay gõ", () => {
		for (const input of [
			"12345678",
			"TA-12345678",
			"ta-12345678",
			"TA 123 456 78",
			" 1234-5678 ",
		]) {
			expect(normalizeCode(input)).toBe("TA-12345678");
		}
	});

	it("giữ nguyên chuỗi khi số chữ số không đúng 8", () => {
		expect(normalizeCode("1234")).toBe("1234");
		expect(normalizeCode("abc")).toBe("ABC");
	});
});

describe("băm IP", () => {
	it("cùng IP cùng muối ra cùng kết quả", async () => {
		expect(await hashIp("1.2.3.4", "muoi")).toBe(await hashIp("1.2.3.4", "muoi"));
	});

	it("đổi muối là đổi kết quả, không dò ngược được sang trang khác", async () => {
		expect(await hashIp("1.2.3.4", "muoi-a")).not.toBe(
			await hashIp("1.2.3.4", "muoi-b"),
		);
	});

	it("không chứa IP gốc", async () => {
		const hashed = await hashIp("203.0.113.9", "muoi");
		expect(hashed).not.toContain("203");
		expect(hashed).toMatch(/^[0-9a-f]{32}$/);
	});

	/**
	 * Cả dải `/64` của một thuê bao IPv6 phải ra cùng một danh tính, nếu không
	 * mọi trần đếm theo IP đều đi vòng qua được bằng cách đổi sang địa chỉ khác
	 * trong dải của chính mình, khoảng 18 tỷ tỷ lựa chọn.
	 */
	it("cả dải /64 của một thuê bao IPv6 chung một danh tính", async () => {
		const a = await hashIp("2001:db8:abcd:1234::1", "muoi");
		const b = await hashIp("2001:db8:abcd:1234:ffff:ffff:ffff:ffff", "muoi");
		expect(a).toBe(b);
	});

	it("hai thuê bao IPv6 khác nhau vẫn tách bạch", async () => {
		const a = await hashIp("2001:db8:abcd:1234::1", "muoi");
		const b = await hashIp("2001:db8:abcd:9999::1", "muoi");
		expect(a).not.toBe(b);
	});

	it("IPv4 không đổi gì", () => {
		expect(ipIdentity("203.0.113.9")).toBe("203.0.113.9");
	});
});

describe("gom địa chỉ IPv6 về /64", () => {
	it("lấy đúng bốn nhóm đầu", () => {
		expect(ipIdentity("2001:db8:abcd:1234:5678:9abc:def0:1234")).toBe(
			"2001:db8:abcd:1234",
		);
	});

	/**
	 * `::` viết tắt cho một dãy nhóm 0, phải bung ra trước khi cắt. Không bung
	 * thì `2001:db8::1` cắt nhầm thành `2001:db8:1`, trùng với một dải khác.
	 */
	it("bung dấu :: ra trước khi cắt", () => {
		expect(ipIdentity("2001:db8::1")).toBe("2001:db8:0:0");
		expect(ipIdentity("2001:db8:0:0::1")).toBe("2001:db8:0:0");
		expect(ipIdentity("2001:db8:0:0:0:0:0:1")).toBe("2001:db8:0:0");
	});

	it("mọi cách viết cùng một dải đều ra một chuỗi", () => {
		const cachViet = [
			"2001:0db8:0000:0001::5",
			"2001:db8:0:1::5",
			"2001:DB8:0:1:0:0:0:5",
		];
		const gom = new Set(cachViet.map(ipIdentity));
		expect(gom.size).toBe(1);
	});

	it("chịu được địa chỉ rút gọn ở đầu và cuối", () => {
		expect(ipIdentity("::1")).toBe("0:0:0:0");
		expect(ipIdentity("fe80::")).toBe("fe80:0:0:0");
	});
});

describe("so sánh chuỗi an toàn", () => {
	it("đúng với chuỗi giống nhau", () => {
		expect(timingSafeEqual("abc123", "abc123")).toBe(true);
	});

	it("sai khi khác nội dung hoặc khác độ dài", () => {
		expect(timingSafeEqual("abc123", "abc124")).toBe(false);
		expect(timingSafeEqual("abc", "abcd")).toBe(false);
		expect(timingSafeEqual("", "a")).toBe(false);
	});
});

describe("mốc thời gian theo UTC", () => {
	it("lấy đúng ngày UTC chứ không theo giờ máy", () => {
		// 00:30 giờ Việt Nam ngày 2 tháng 5 vẫn là ngày 1 tháng 5 theo UTC.
		expect(utcDay(new Date("2026-05-01T17:30:00Z"))).toBe("2026-05-01");
	});

	it("đếm đúng số giây còn lại tới nửa đêm UTC", () => {
		expect(secondsUntilUtcMidnight(new Date("2026-05-01T23:00:00Z"))).toBe(3600);
		expect(secondsUntilUtcMidnight(new Date("2026-05-01T00:00:00Z"))).toBe(86400);
	});

	it("không bao giờ trả về 0, đồng hồ đếm ngược cần một con số dương", () => {
		expect(
			secondsUntilUtcMidnight(new Date("2026-05-01T23:59:59.999Z")),
		).toBeGreaterThan(0);
	});
});

describe("base64url", () => {
	it("mã hoá rồi giải mã ra đúng dữ liệu ban đầu", () => {
		for (const length of [0, 1, 2, 3, 16, 31, 64]) {
			const bytes = new Uint8Array(length).map((_, i) => (i * 37) % 256);
			expect(b64urlDecode(b64urlEncode(bytes))).toEqual(bytes);
		}
	});

	it("không sinh ký tự phải escape khi nằm trong URL hay cookie", () => {
		const bytes = new Uint8Array(96).map((_, i) => i * 3);
		expect(b64urlEncode(bytes)).toMatch(/^[A-Za-z0-9_-]+$/);
	});
});

describe("nhận diện máy lập trình", () => {
	it("chỉ chấp nhận host cục bộ", () => {
		expect(isLocalRequest("http://localhost:5173/api/config")).toBe(true);
		expect(isLocalRequest("http://127.0.0.1:8787/")).toBe(true);
		expect(isLocalRequest("https://tuan-ai.bttvn-4t.workers.dev/")).toBe(false);
		// Tên miền cố tình đặt cho giống, không được lọt.
		expect(isLocalRequest("https://localhost.ke-gian.com/")).toBe(false);
		expect(isLocalRequest("khong-phai-url")).toBe(false);
	});

	it("chỉ nới lỏng cho máy lập trình, và tắt được bằng cookie", () => {
		expect(devRelaxed("http://localhost:5173/api/submit", "")).toBe(true);
		expect(devRelaxed("http://127.0.0.1:8787/api/submit", "abc=1")).toBe(true);

		// Nút "Xem như production" trong /admin: local nhưng chịu đúng luật thật.
		expect(
			devRelaxed("http://localhost:5173/api/submit", "tuanai_devmode=prod"),
		).toBe(false);

		// Trên production thì không cookie nào mở được cửa này.
		const live = "https://tuan-ai.bttvn-4t.workers.dev/api/submit";
		expect(devRelaxed(live, "")).toBe(false);
		expect(devRelaxed(live, "tuanai_devmode=dev")).toBe(false);
	});
});

describe("cắt chữ nhập vào", () => {
	it("cắt đúng độ dài và bỏ khoảng trắng thừa", () => {
		expect(clampText("  xin chào  ", 20)).toBe("xin chào");
		expect(clampText("a".repeat(100), 10)).toBe("a".repeat(10));
	});

	it("trả về chuỗi rỗng với thứ không phải chuỗi", () => {
		expect(clampText(null, 10)).toBe("");
		expect(clampText(undefined, 10)).toBe("");
		expect(clampText(42, 10)).toBe("");
	});
});

describe("bài gửi đã đủ để duyệt chưa", () => {
	it("có mô tả là đủ, không cần chọn kiểu", () => {
		expect(hasEnoughToSubmit("Lan", "cho ấm trà cúi chào", [])).toBe(true);
	});

	it("chỉ chọn kiểu, không viết gì cũng được", () => {
		// Đây là cả lý do của hàm này: người chỉ có tấm ảnh vẫn gửi được.
		expect(hasEnoughToSubmit("Lan", "", ["surprise"])).toBe(true);
	});

	it("không mô tả, không kiểu thì chưa đủ", () => {
		expect(hasEnoughToSubmit("Lan", "", [])).toBe(false);
	});

	it("thiếu tên thì không đủ, dù có đủ thứ khác", () => {
		expect(hasEnoughToSubmit("", "cho gấu bông vẫy tay", ["funny"])).toBe(false);
	});
});
