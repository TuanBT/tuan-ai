-- Công tắc bảo trì: đóng cả trang lại khi cần sửa chữa.
--
-- Khác với `submissions_open`: tắt nhận bài là trang vẫn chạy, người cầm mã vẫn
-- tra được bài của mình. Bảo trì là dừng hẳn trang chủ lẫn trang tra cứu, dùng
-- cho lúc đang sửa dữ liệu — thứ trang trả về khi đó chưa chắc còn đúng.
--
-- Hai dòng này chỉ để chúng hiện sẵn trong /admin → Cài đặt. Thiếu thì mã nguồn
-- cũng hiểu là đang chạy bình thường, không phải là đang bảo trì.
--
-- DO NOTHING: không bao giờ tự tắt hộ một công tắc bảo trì mà chủ trang đã bật.

INSERT INTO settings (key, value) VALUES
  ('maintenance_mode', '0'),
  ('maintenance_note', '')
  ON CONFLICT(key) DO NOTHING;
