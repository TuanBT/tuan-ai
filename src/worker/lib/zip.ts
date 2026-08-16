/**
 * Bộ đóng gói ZIP viết tay, không nén.
 *
 * Không dùng thư viện ngoài vì cả gói chỉ gồm ảnh JPEG/PNG/WebP — vốn đã nén rồi
 * — với vài tệp văn bản nhỏ, nên nén thêm gần như không giảm được byte nào mà
 * lại kéo theo phụ thuộc và thời gian CPU trong Worker.
 *
 * Quan trọng hơn: hàm ở đây trả về một luồng và nhận vào một `AsyncIterable`, nên
 * người gọi nạp từng tệp một rồi thả ra ngay. Gom cả gói vào bộ nhớ trước khi
 * gửi là cách chắc chắn chạm trần 128 MB của Worker khi tải cả đợt bài.
 */

/** Bảng tra CRC-32 (đa thức 0xEDB88320), dựng một lần cho cả tiến trình. */
const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let bit = 0; bit < 8; bit++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c >>> 0;
	}
	return table;
})();

export function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) {
		crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFile {
	/** Đường dẫn trong gói. Dùng dấu `/` kể cả khi máy chủ chạy trên Windows. */
	name: string;
	data: Uint8Array;
	/** Thời điểm gắn cho tệp; mặc định là lúc đóng gói. */
	at?: Date;
}

/**
 * Giờ và ngày theo định dạng MS-DOS mà ZIP dùng: giây chia đôi, năm tính từ
 * 1980. Trước 1980 thì không biểu diễn được, nên kẹp lại thay vì tràn số.
 */
function dosTime(at: Date): { time: number; date: number } {
	const year = Math.max(1980, at.getUTCFullYear());
	return {
		time:
			(at.getUTCHours() << 11) |
			(at.getUTCMinutes() << 5) |
			(at.getUTCSeconds() >> 1),
		date:
			((year - 1980) << 9) | ((at.getUTCMonth() + 1) << 5) | at.getUTCDate(),
	};
}

const encoder = new TextEncoder();

/** Cờ bit 11: tên tệp là UTF-8. Thiếu cờ này thì tên có dấu hiện ra thành rác. */
const FLAG_UTF8 = 0x0800;

interface Entry {
	nameBytes: Uint8Array;
	crc: number;
	size: number;
	offset: number;
	time: number;
	date: number;
}

function localHeader(entry: Entry): Uint8Array {
	const buf = new Uint8Array(30 + entry.nameBytes.length);
	const view = new DataView(buf.buffer);
	view.setUint32(0, 0x04034b50, true);
	view.setUint16(4, 20, true); // phiên bản cần để giải nén
	view.setUint16(6, FLAG_UTF8, true);
	view.setUint16(8, 0, true); // phương pháp 0 = xếp thẳng, không nén
	view.setUint16(10, entry.time, true);
	view.setUint16(12, entry.date, true);
	view.setUint32(14, entry.crc, true);
	view.setUint32(18, entry.size, true);
	view.setUint32(22, entry.size, true);
	view.setUint16(26, entry.nameBytes.length, true);
	view.setUint16(28, 0, true);
	buf.set(entry.nameBytes, 30);
	return buf;
}

function centralDirectory(entries: Entry[], start: number): Uint8Array {
	const size = entries.reduce((sum, e) => sum + 46 + e.nameBytes.length, 0);
	const buf = new Uint8Array(size + 22);
	const view = new DataView(buf.buffer);
	let at = 0;

	for (const entry of entries) {
		view.setUint32(at, 0x02014b50, true);
		view.setUint16(at + 4, 20, true); // phiên bản đã dùng để tạo
		view.setUint16(at + 6, 20, true);
		view.setUint16(at + 8, FLAG_UTF8, true);
		view.setUint16(at + 10, 0, true);
		view.setUint16(at + 12, entry.time, true);
		view.setUint16(at + 14, entry.date, true);
		view.setUint32(at + 16, entry.crc, true);
		view.setUint32(at + 20, entry.size, true);
		view.setUint32(at + 24, entry.size, true);
		view.setUint16(at + 28, entry.nameBytes.length, true);
		view.setUint32(at + 42, entry.offset, true);
		buf.set(entry.nameBytes, at + 46);
		at += 46 + entry.nameBytes.length;
	}

	// Bản ghi kết thúc: chỗ trình giải nén tìm đến đầu tiên để biết gói có gì.
	view.setUint32(at, 0x06054b50, true);
	view.setUint16(at + 8, entries.length, true);
	view.setUint16(at + 10, entries.length, true);
	view.setUint32(at + 12, size, true);
	view.setUint32(at + 16, start, true);
	return buf;
}

export function zipStream(files: AsyncIterable<ZipFile>): ReadableStream<Uint8Array> {
	const entries: Entry[] = [];
	let offset = 0;
	const iterator = files[Symbol.asyncIterator]();

	return new ReadableStream<Uint8Array>({
		// Đẩy đúng một tệp mỗi lượt `pull`, để trình duyệt tải chậm thì Worker cũng
		// chờ theo chứ không nạp sẵn cả đợt ảnh vào bộ nhớ.
		async pull(controller) {
			const next = await iterator.next();

			if (next.done) {
				controller.enqueue(centralDirectory(entries, offset));
				controller.close();
				return;
			}

			const file = next.value;
			const { time, date } = dosTime(file.at ?? new Date());
			const entry: Entry = {
				nameBytes: encoder.encode(file.name),
				crc: crc32(file.data),
				size: file.data.length,
				offset,
				time,
				date,
			};

			entries.push(entry);
			controller.enqueue(localHeader(entry));
			controller.enqueue(file.data);
			offset += 30 + entry.nameBytes.length + entry.size;
		},

		async cancel(reason) {
			await iterator.return?.(reason);
		},
	});
}
