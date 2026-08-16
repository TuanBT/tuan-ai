-- Một bài lên cả TikTok lẫn YouTube, nên phải có chỗ cho cả hai link.
--
-- Trước đây chỉ có một cột `published_url` với một ô nhập mang nhãn
-- "TikTok / YouTube": dán link thứ hai vào là đè mất link thứ nhất, mà người
-- gửi mở bài ra cũng chỉ thấy được một trong hai nơi tác phẩm của họ đang nằm.
--
-- Đổi tên cột cũ thay vì thêm hai cột mới rồi chép qua: link TikTok đã có ở lại
-- đúng chỗ, không nhân bản dữ liệu, và không còn cột nào thừa nằm lại trong
-- lược đồ để lần sau đọc phải đoán xem cột nào mới là thật.

ALTER TABLE submissions RENAME COLUMN published_url TO published_tiktok;
ALTER TABLE submissions ADD COLUMN published_youtube TEXT;

-- Ô cũ nhận cả hai loại link, nên chỗ nào đã lỡ dán link YouTube thì chuyển
-- sang đúng cột của nó. Cả `youtube.com` lẫn `youtu.be` đều chứa "youtu", còn
-- link TikTok thì không bao giờ.
UPDATE submissions
   SET published_youtube = published_tiktok,
       published_tiktok = NULL
 WHERE published_tiktok LIKE '%youtu%';
