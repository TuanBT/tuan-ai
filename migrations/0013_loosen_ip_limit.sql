-- Nới trần số bài mỗi IP trên những bản đã chạy.
--
-- Đổi `FALLBACK` trong lib/settings.ts thôi là chưa đủ, và đây là chỗ dễ tưởng
-- nhầm là đã xong: `parseSettings` đọc giá trị trong bảng `settings` trước, chỉ
-- rơi về `FALLBACK` khi không có dòng nào. Mà 0001 đã gieo sẵn '3' vào bảng, nên
-- mọi bản đang chạy vẫn giữ nguyên con số cũ dù code đã đổi.
--
-- Vì sao nới: xem chú thích ở `max_per_ip_day` trong lib/settings.ts. Tóm lại là
-- 3 ngầm giả định mỗi IP là một người, mà khách vào từ TikTok gần như toàn dùng
-- 4G — hàng trăm thuê bao chung một địa chỉ qua CGNAT.
--
-- Ràng buộc `value = '3'` là có chủ ý: chỉ sửa những bản còn nguyên giá trị gieo
-- ban đầu. Ai đã tự chỉnh con số này trong trang Cài đặt thì lựa chọn của họ
-- được giữ nguyên, migration không giẫm lên.

UPDATE settings SET value = '20' WHERE key = 'max_per_ip_day' AND value = '3';
