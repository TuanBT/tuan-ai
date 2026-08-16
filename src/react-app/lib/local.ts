/**
 * localStorage nhưng không bao giờ ném lỗi.
 *
 * Trình duyệt chặn storage nhiều hơn bạn tưởng: Safari ở chế độ khoá, trang
 * nhúng trong iframe khác tên miền, chế độ riêng tư của vài trình duyệt cũ, và
 * cả khi hết dung lượng. Trước đây phần chọn ngôn ngữ đọc thẳng localStorage
 * ngay lúc dựng ứng dụng, nên một trong các trường hợp đó không làm mất tính
 * năng chọn ngôn ngữ mà làm trắng cả trang.
 */
export function readLocal(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function writeLocal(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Không lưu được thì thôi, đây luôn là tiện ích thêm, không phải nguồn
		// dữ liệu chính.
	}
}

export function removeLocal(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch {
		// như trên
	}
}
