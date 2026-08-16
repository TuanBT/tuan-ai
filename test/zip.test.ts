import { describe, expect, it } from "vitest";
import { crc32, zipStream, type ZipFile } from "../src/worker/lib/zip";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function* listOf(files: ZipFile[]): AsyncGenerator<ZipFile> {
	for (const file of files) yield file;
}

async function build(files: ZipFile[]): Promise<Uint8Array> {
	const chunks: Uint8Array[] = [];
	for await (const chunk of zipStream(listOf(files)) as unknown as AsyncIterable<Uint8Array>) {
		chunks.push(chunk);
	}
	const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const out = new Uint8Array(total);
	let at = 0;
	for (const chunk of chunks) {
		out.set(chunk, at);
		at += chunk.length;
	}
	return out;
}

/**
 * Trình đọc zip viết riêng cho test, đi ngược từ bản ghi kết thúc y như một
 * trình giải nén thật: đọc mục lục rồi nhảy tới từng tệp theo vị trí ghi trong
 * đó. Đọc xuôi theo thứ tự đã ghi thì chỗ nào tính sai vị trí cũng vẫn qua.
 */
function readZip(zip: Uint8Array): Array<{ name: string; text: string }> {
	const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
	const eocd = zip.length - 22;
	expect(view.getUint32(eocd, true)).toBe(0x06054b50);

	const count = view.getUint16(eocd + 10, true);
	const dirSize = view.getUint32(eocd + 12, true);
	let at = view.getUint32(eocd + 16, true);
	expect(at + dirSize).toBe(eocd);

	const files: Array<{ name: string; text: string }> = [];
	for (let i = 0; i < count; i++) {
		expect(view.getUint32(at, true)).toBe(0x02014b50);
		const crc = view.getUint32(at + 16, true);
		const size = view.getUint32(at + 24, true);
		const nameLen = view.getUint16(at + 28, true);
		const offset = view.getUint32(at + 42, true);
		const name = decoder.decode(zip.subarray(at + 46, at + 46 + nameLen));

		expect(view.getUint32(offset, true)).toBe(0x04034b50);
		const localNameLen = view.getUint16(offset + 26, true);
		const start = offset + 30 + localNameLen;
		const data = zip.subarray(start, start + size);

		expect(crc32(data)).toBe(crc);
		files.push({ name, text: decoder.decode(data) });
		at += 46 + nameLen;
	}
	return files;
}

describe("crc32", () => {
	// Giá trị kiểm tra chuẩn của CRC-32: chuỗi "123456789" phải ra 0xCBF43926.
	it("khớp giá trị kiểm tra chuẩn", () => {
		expect(crc32(encoder.encode("123456789"))).toBe(0xcbf43926);
	});

	it("cho ra kết quả khác nhau với dữ liệu khác nhau", () => {
		expect(crc32(encoder.encode("a"))).not.toBe(crc32(encoder.encode("b")));
	});
});

describe("zipStream", () => {
	it("gói lại rồi đọc ngược ra đúng nội dung cũ", async () => {
		const zip = await build([
			{ name: "TA-12345678/noi-dung.txt", data: encoder.encode("Xin chào") },
			{ name: "TA-12345678/01.jpg", data: new Uint8Array([1, 2, 3, 4, 5]) },
			{ name: "danh-sach.txt", data: encoder.encode("mục lục") },
		]);

		const files = readZip(zip);
		expect(files.map((f) => f.name)).toEqual([
			"TA-12345678/noi-dung.txt",
			"TA-12345678/01.jpg",
			"danh-sach.txt",
		]);
		expect(files[0].text).toBe("Xin chào");
		expect(files[2].text).toBe("mục lục");
	});

	it("giữ nguyên tên tệp có dấu tiếng Việt", async () => {
		const zip = await build([
			{ name: "mô-tả.txt", data: encoder.encode("nội dung") },
		]);
		expect(readZip(zip)[0].name).toBe("mô-tả.txt");
	});

	it("dựng được gói rỗng mà không hỏng bản ghi kết thúc", async () => {
		const zip = await build([]);
		expect(zip.length).toBe(22);
		expect(readZip(zip)).toEqual([]);
	});

	it("không gom cả gói vào bộ nhớ trước khi gửi", async () => {
		// Mỗi lượt `pull` chỉ được lấy đúng một tệp: nếu bộ đóng gói duyệt hết
		// nguồn ngay từ đầu thì gói cả đợt sẽ ôm hàng trăm MB ảnh cùng lúc.
		let taken = 0;
		async function* counted(): AsyncGenerator<ZipFile> {
			for (let i = 0; i < 5; i++) {
				taken++;
				yield { name: `${i}.txt`, data: encoder.encode(String(i)) };
			}
		}

		const reader = zipStream(counted()).getReader();
		await reader.read();
		expect(taken).toBe(1);
		await reader.cancel();
	});
});
