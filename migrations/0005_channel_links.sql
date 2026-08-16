-- Đường dẫn hai kênh, để trang có chỗ dẫn người xem sang.
--
-- Đặt sẵn ở đây thay vì viết cứng trong mã: đổi tên kênh hay mở kênh mới thì
-- sửa trong /admin → Cài đặt là xong, không phải deploy lại.
--
-- DO NOTHING: chủ trang đã tự nhập đường dẫn khác thì giữ nguyên của họ.

INSERT INTO settings (key, value) VALUES
  ('tiktok_url',  'https://www.tiktok.com/@tuan_0820'),
  ('youtube_url', 'https://www.youtube.com/@tuan-ai-0820')
  ON CONFLICT(key) DO NOTHING;
