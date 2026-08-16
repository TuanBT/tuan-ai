import { readLocal, removeLocal, writeLocal } from "./local";

/**
 * Tên hiển thị và email của người gửi, nhớ hộ ngay trong máy họ.
 *
 * Hai ô này gõ một lần rồi gần như không đổi nữa, mà trang thì không có tài
 * khoản để tự điền hộ. Ai gửi bài lần thứ hai không việc gì phải gõ lại email
 * của chính mình.
 *
 * Chỉ ghi sau khi gửi thành công, không ghi trong lúc gõ: người mở form rồi bỏ
 * ngang giữa chừng thì lần sau không thấy một cái tên cụt lủn nằm sẵn trong ô.
 *
 * Nằm trọn trong trình duyệt, không gửi đi đâu, và xoá được: nút "Xoá khỏi máy
 * này" ở trang Bài của tôi dọn luôn chỗ này. Cùng lý do với danh sách mã bài
 * trong `mine.ts`, đây là tiện ích chứ không phải nơi cất giữ — mất là chuyện
 * bình thường, form vẫn phải dùng được khi ô trống.
 */
const NICKNAME_KEY = "tuanai_nickname";
const EMAIL_KEY = "tuanai_email";

/** Đúng bằng maxLength của hai ô trong form, và bằng mức máy chủ cắt. */
const NICKNAME_MAX = 60;
const EMAIL_MAX = 120;

export interface Contact {
	nickname: string;
	email: string;
}

/**
 * Cắt lại khi đọc: giá trị trong storage có thể là bản cũ hoặc do người dùng tự
 * sửa, mà `maxLength` của ô nhập chỉ chặn lúc gõ chứ không chặn giá trị đặt sẵn.
 */
export function readContact(): Contact {
	return {
		nickname: (readLocal(NICKNAME_KEY) ?? "").slice(0, NICKNAME_MAX),
		email: (readLocal(EMAIL_KEY) ?? "").slice(0, EMAIL_MAX),
	};
}

export function saveContact(contact: Contact): void {
	const nickname = contact.nickname.trim();
	const email = contact.email.trim();
	// Bỏ trống là một lựa chọn, không phải là "giữ nguyên cái cũ": ai vừa xoá
	// email khỏi form thì lần sau cũng không muốn thấy nó quay lại.
	if (nickname) writeLocal(NICKNAME_KEY, nickname.slice(0, NICKNAME_MAX));
	else removeLocal(NICKNAME_KEY);
	if (email) writeLocal(EMAIL_KEY, email.slice(0, EMAIL_MAX));
	else removeLocal(EMAIL_KEY);
}

export function forgetContact(): void {
	removeLocal(NICKNAME_KEY);
	removeLocal(EMAIL_KEY);
}

/** Để trang Bài của tôi biết có gì đáng dọn không, kể cả khi chưa lưu mã nào. */
export function hasContact(): boolean {
	const contact = readContact();
	return contact.nickname.length > 0 || contact.email.length > 0;
}
