/**
 * Nén ảnh ngay trong trình duyệt trước khi gửi lên.
 *
 * Đây là thứ giữ cho dung lượng và băng thông không bao giờ thành vấn đề: một
 * tấm ảnh điện thoại 3–5MB co lại còn khoảng 200–300KB mà mắt thường gần như
 * không thấy khác. Server không phải làm gì cả.
 */

const MAX_EDGE = 1600;
const TARGET_BYTES = 300_000;
const HARD_LIMIT_BYTES = 1_400_000;

/**
 * Lỗi có mã, để chỗ gọi biết nên báo gì.
 *
 * Trước đây mọi trục trặc ở đây đều ra một câu duy nhất: "Có tấm ảnh quá nặng."
 * Ảnh nặng thật thì đúng, còn tấm ảnh trình duyệt không giải mã nổi cũng bị báo
 * y hệt — người dùng đi nén ảnh cho nhỏ lại rồi gặp lại đúng câu đó.
 */
export class ImageError extends Error {
	constructor(public code: "image_size" | "image_read") {
		super(code);
	}
}

async function toBlob(
	canvas: HTMLCanvasElement,
	quality: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) =>
				blob ? resolve(blob) : reject(new ImageError("image_read")),
			"image/jpeg",
			quality,
		);
	});
}

export async function compressImage(file: File): Promise<File> {
	// `from-image` để ảnh chụp dọc không bị xoay ngang khi vẽ lên canvas.
	//
	// Ảnh iPhone là HEIC; iOS tự đổi sang JPEG khi đưa file cho form web, và dù
	// không đổi thì Safari vẫn giải mã được ở đây rồi xuất lại JPEG bên dưới. Cái
	// ném ra ở đây là tệp hỏng, hoặc định dạng máy này không đọc nổi — chuyện
	// khác hẳn với ảnh quá nặng, nên mã lỗi cũng phải khác.
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
	} catch {
		throw new ImageError("image_read");
	}

	const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
	const width = Math.round(bitmap.width * scale);
	const height = Math.round(bitmap.height * scale);

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		bitmap.close();
		return file;
	}
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();

	let quality = 0.82;
	let blob = await toBlob(canvas, quality);

	// Ảnh nhiều chi tiết có thể vẫn nặng sau lần nén đầu; hạ dần chất lượng cho
	// tới khi đủ nhẹ, nhưng không xuống dưới mức trông thấy rõ vỡ hạt.
	while (blob.size > TARGET_BYTES && quality > 0.5) {
		quality -= 0.1;
		blob = await toBlob(canvas, quality);
	}

	if (blob.size > HARD_LIMIT_BYTES) {
		throw new ImageError("image_size");
	}

	const name = file.name.replace(/\.[^.]+$/, "") || "anh";
	return new File([blob], `${name}.jpg`, {
		type: "image/jpeg",
		lastModified: Date.now(),
	});
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
