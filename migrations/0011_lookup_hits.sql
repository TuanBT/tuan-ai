-- Đếm cả lượt tra trúng, không riêng lượt trượt.
--
-- Bảng này (xem 0002) ra đời chỉ để đếm lần đoán sai, với lý lẽ đúng ở thời
-- điểm đó: tra đúng mã của mình bao nhiêu lần cũng được. Lỗ hổng nằm ở chỗ lý
-- lẽ ấy chỉ đúng khi *mọi* cửa dẫn vào bài đều có bộ đếm. Thiếu một cửa thôi là
-- người dò dùng cửa đó để lọc ra mã thật, rồi quay lại hai cửa có khoá và chỉ
-- gõ toàn mã đúng — không sinh ra lượt trượt nào, bộ đếm đứng nguyên ở 0 trong
-- lúc kho ảnh bị múc dần.
--
-- Trần cho lượt trúng vá đúng chỗ đó. Nó phải rộng hơn hẳn trần lượt trượt, vì
-- người thật tra trúng là chuyện bình thường: đây không phải hàng rào nhắm vào
-- người dùng, mà là trần chống thu hoạch hàng loạt, có tác dụng kể cả khi sau
-- này lại mọc thêm một cửa quên mang theo khoá.
--
-- Tên bảng giữ nguyên `lookup_misses` dù giờ nó đếm cả hai. Đổi tên bảng trong
-- SQLite là dựng bảng mới rồi chép dữ liệu sang, không đáng cho một cái tên.

ALTER TABLE lookup_misses ADD COLUMN hits INTEGER NOT NULL DEFAULT 0;
