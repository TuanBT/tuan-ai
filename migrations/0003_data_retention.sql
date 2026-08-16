-- Hạn giữ dữ liệu mô tả, tách khỏi hạn giữ ảnh.
--
-- Trước đây chỉ ảnh mới tự xoá; tên, mô tả và email của người gửi nằm lại trong
-- D1 vĩnh viễn, dù trang nói với người dùng là dữ liệu của họ tự biến mất. Sau
-- ngần này ngày, bản quét đêm xoá hẳn dòng của những bài không lên sóng, và xoá
-- email của những bài đã lên sóng (dòng đó phải giữ để hiện ở khu "Đã lên sóng").

INSERT INTO settings (key, value) VALUES ('data_retention_days', '90')
  ON CONFLICT(key) DO NOTHING;
