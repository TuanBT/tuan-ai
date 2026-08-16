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

async function toBlob(
	canvas: HTMLCanvasElement,
	quality: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
			"image/jpeg",
			quality,
		);
	});
}

export async function compressImage(file: File): Promise<File> {
	// `from-image` để ảnh chụp dọc không bị xoay ngang khi vẽ lên canvas.
	const bitmap = await createImageBitmap(file, {
		imageOrientation: "from-image",
	});

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
		throw new Error("image_too_large");
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
