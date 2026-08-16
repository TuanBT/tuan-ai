export const CODE_PREFIX = "TA-";
export const CODE_LENGTH = 8;

/** Chỉ giữ chữ số, cắt đúng 8 ký tự — dùng cho ô nhập mã. */
export function digitsOnly(input: string): string {
	return input.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

/** Phần số của mã, để đổ vào ô nhập vốn đã có sẵn tiền tố. */
export function codeDigits(code: string): string {
	return code.replace(/^TA-/, "");
}

/** Mã đầy đủ để hiển thị và chép đi nơi khác. */
export function fullCode(digits: string): string {
	return `${CODE_PREFIX}${digits}`;
}
