/**
 * Gói làm việc cho người duyệt bài.
 *
 * Việc thật của người duyệt là: mở bài, lấy ảnh gốc, lấy mô tả, mang sang công
 * cụ dựng clip. Trước đây phải bấm từng ảnh ra tab mới rồi chuột phải lưu, còn
 * mô tả thì bôi đen chép tay. Ở đây gộp hết vào một tệp zip: ảnh đặt tên theo
 * thứ tự, một tệp văn bản để đọc và chép, một tệp JSON để máy khác đọc.
 */

import { blobs } from "./storage";
import type { ZipFile } from "./zip";

export interface SubmissionRow {
	code: string;
	nickname: string;
	email: string | null;
	description: string;
	styles: string;
	images: string;
	status: string;
	published_url: string | null;
	admin_note: string | null;
	lang: string;
	bytes: number;
	created_at: number;
	expires_at: number;
	images_purged: number;
}

interface ImageMeta {
	key: string;
	type: string;
	size: number;
}

interface ImageFile {
	file: string;
	type: string;
	size: number;
}

const EXTENSIONS: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

export const STATUS_TEXT: Record<string, string> = {
	new: "Mới",
	selected: "Đã chọn",
	done: "Đã lên sóng",
	rejected: "Bỏ qua",
};

/** Bản không dấu của trạng thái, dùng đặt tên tệp zip cho an toàn mọi hệ máy. */
export const STATUS_SLUG: Record<string, string> = {
	new: "moi",
	selected: "da-chon",
	done: "da-len-song",
	rejected: "bo-qua",
};

const encoder = new TextEncoder();

/**
 * Dấu BOM mở đầu tệp văn bản. Notepad trên Windows thiếu nó là đọc tiếng Việt ra
 * ký tự lạ. Viết dạng mã thoát vì ký tự này vô hình trong trình soạn thảo.
 */
export const BOM = "\uFEFF";

/**
 * Người duyệt ngồi ở Việt Nam, còn `created_at` là mốc UTC. Cộng tay bảy tiếng
 * thay vì nhờ `toLocaleString`, để kết quả không đổi theo múi giờ của máy chủ
 * hay theo việc bản workerd có sẵn dữ liệu múi giờ hay không.
 */
export function vnTime(ms: number): string {
	const at = new Date(ms + 7 * 3_600_000);
	const pad = (n: number) => String(n).padStart(2, "0");
	return (
		`${pad(at.getUTCDate())}/${pad(at.getUTCMonth() + 1)}/${at.getUTCFullYear()}` +
		` ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`
	);
}

function styleList(row: SubmissionRow, labels: Map<string, string>): string[] {
	const ids = JSON.parse(row.styles) as string[];
	// Bài cũ có thể mang kiểu mà chủ trang đã xoá khỏi bảng; giữ nguyên mã kiểu
	// còn hơn để trống, vì trống thì không còn manh mối nào về ý người gửi.
	return ids.map((id) => labels.get(id) ?? id);
}

const RULE = "-".repeat(60);

/**
 * Tệp để mắt người đọc và tay người chép.
 *
 * Phần mô tả nằm riêng một khối giữa hai đường kẻ, không thụt lề, không tiền tố:
 * bôi đen từ mép trái là được đúng chữ người gửi viết, không dính nhãn.
 */
export function readableText(
	row: SubmissionRow,
	labels: Map<string, string>,
	files: ImageFile[],
): string {
	const styles = styleList(row, labels);
	const dash = "—";
	const fields: Array<[string, string]> = [
		["Người gửi", row.nickname],
		["Email", row.email || dash],
		["Gửi lúc", `${vnTime(row.created_at)} (giờ VN)`],
		["Trạng thái", STATUS_TEXT[row.status] ?? row.status],
		["Ngôn ngữ", row.lang === "en" ? "Tiếng Anh" : "Tiếng Việt"],
		["Kiểu đã chọn", styles.length ? styles.join(" · ") : dash],
		[
			"Ảnh trong gói",
			files.length
				? files.map((f) => f.file).join(", ")
				: "không có (ảnh gốc đã hết hạn lưu)",
		],
		["Ghi chú của bạn", row.admin_note || dash],
		["Link đã đăng", row.published_url || dash],
	];

	const width = Math.max(...fields.map(([label]) => label.length));
	const lines = [
		`TUÂN AI · ${row.code}`,
		"=".repeat(60),
		"",
		...fields.map(([label, value]) => `${label.padEnd(width)} : ${value}`),
		"",
		RULE,
		"MÔ TẢ CỦA NGƯỜI GỬI  (chép nguyên khối bên dưới)",
		RULE,
		row.description,
		RULE,
	];

	// Xuống dòng kiểu Windows và dấu BOM ở đầu: tệp này hay được mở bằng Notepad,
	// nơi thiếu một trong hai thứ đó là ra một dòng dài dính liền hoặc vỡ dấu.
	return `${BOM}${lines.join("\r\n")}\r\n`;
}

/** Bản cho máy đọc, để nối sang công cụ dựng clip mà không phải bóc chữ. */
export function machineJson(
	row: SubmissionRow,
	labels: Map<string, string>,
	files: ImageFile[],
): Record<string, unknown> {
	const ids = JSON.parse(row.styles) as string[];
	return {
		code: row.code,
		nickname: row.nickname,
		email: row.email,
		description: row.description,
		styles: ids.map((id) => ({ id, label: labels.get(id) ?? id })),
		status: row.status,
		statusLabel: STATUS_TEXT[row.status] ?? row.status,
		publishedUrl: row.published_url,
		adminNote: row.admin_note,
		lang: row.lang,
		createdAt: row.created_at,
		createdAtIso: new Date(row.created_at).toISOString(),
		createdAtVn: vnTime(row.created_at),
		images: files,
		imagesPurged: Boolean(row.images_purged),
	};
}

/**
 * Các tệp của một bài. `prefix` là thư mục bọc ngoài, dùng khi gói cả đợt.
 *
 * Ảnh lấy từ kho lần lượt từng tấm chứ không `Promise.all`: gói cả đợt có thể
 * chạm tới hàng chục tấm, và ở đây mỗi lượt chỉ giữ đúng một tấm trong bộ nhớ.
 */
export async function* submissionEntries(
	env: Env,
	row: SubmissionRow,
	labels: Map<string, string>,
	prefix = "",
): AsyncGenerator<ZipFile> {
	const at = new Date(row.created_at);
	const files: ImageFile[] = [];

	if (!row.images_purged) {
		const store = blobs(env);
		const metas = JSON.parse(row.images) as ImageMeta[];

		for (const [index, meta] of metas.entries()) {
			// Ảnh có thể vừa hết hạn KV trong lúc D1 chưa kịp đánh dấu. Bỏ qua tấm
			// đó chứ không làm hỏng cả gói; tệp văn bản sẽ nói đúng những gì có.
			const found = await store.get(meta.key);
			if (!found) continue;

			const name = `${String(index + 1).padStart(2, "0")}.${
				EXTENSIONS[found.contentType] ?? "bin"
			}`;
			files.push({
				file: name,
				type: found.contentType,
				size: found.data.byteLength,
			});
			yield { name: `${prefix}${name}`, data: new Uint8Array(found.data), at };
		}
	}

	yield {
		name: `${prefix}noi-dung.txt`,
		data: encoder.encode(readableText(row, labels, files)),
		at,
	};
	yield {
		name: `${prefix}noi-dung.json`,
		data: encoder.encode(
			`${JSON.stringify(machineJson(row, labels, files), null, 2)}\n`,
		),
		at,
	};
}

/** Mục lục đặt ở gốc gói cả đợt, để mở ra là biết trong đó có những bài nào. */
export function indexText(
	rows: SubmissionRow[],
	labels: Map<string, string>,
): string {
	const lines = [
		`TUÂN AI · GÓI ${rows.length} BÀI`,
		`Tải lúc ${vnTime(Date.now())} (giờ VN)`,
		"=".repeat(60),
		"",
		"Mỗi bài một thư mục mang tên mã bài. Trong đó có ảnh gốc,",
		"noi-dung.txt để đọc và chép, noi-dung.json để máy khác đọc.",
		"",
		RULE,
	];

	for (const row of rows) {
		const styles = styleList(row, labels);
		lines.push(
			`${row.code}  ·  ${row.nickname}  ·  ${STATUS_TEXT[row.status] ?? row.status}`,
			`gửi ${vnTime(row.created_at)}${styles.length ? `  ·  ${styles.join(" · ")}` : ""}`,
			row.description.replace(/\s+/g, " ").slice(0, 200),
			RULE,
		);
	}

	return `${BOM}${lines.join("\r\n")}\r\n`;
}
