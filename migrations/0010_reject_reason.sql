-- Lý do bỏ qua, viết cho chính người gửi đọc.
--
-- Khác `admin_note`: ghi chú đó là của chủ trang, chỉ đi theo gói tải về và file
-- CSV, người gửi không bao giờ thấy. Cột này ngược lại: trang tra cứu trả nó
-- về cho người cầm mã, và chỉ khi bài mang trạng thái `rejected`. Bỏ trống thì
-- trang vẫn hiện câu chung như trước, nên viết hay không là tuỳ từng bài.
--
-- Giữ lại cả sau khi bài được đổi sang trạng thái khác: chủ trang đổi ý, bấm
-- lại "Bỏ qua" thì lý do cũ còn nguyên, khỏi gõ lại.

ALTER TABLE submissions ADD COLUMN reject_reason TEXT;
