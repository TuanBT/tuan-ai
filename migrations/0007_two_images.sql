-- Số ảnh tối đa mỗi bài: 3 xuống 2.
--
-- Gần như mọi bài chỉ cần đúng một tấm, tấm thứ hai để đổi góc. Ô thứ ba chỉ
-- làm bước chọn ảnh dài thêm, gói tải nặng thêm, và tốn thêm một lượt ghi KV
-- trong hạn mức mỗi ngày.
--
-- Điều kiện "giá trị vẫn đúng như bản gốc" giữ nguyên chỗ chủ trang đã tự sửa
-- trong /admin: ai đã cố ý đặt 4 hay 5 thì migration này không đụng vào.

UPDATE settings SET value = '2' WHERE key = 'max_images' AND value = '3';
