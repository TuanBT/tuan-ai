-- Đếm riêng những lượt bị chặn vì chạm trần theo IP.
--
-- `blocked` có sẵn chỉ đếm nhánh hết hạn mức ghi trong ngày. Nhánh còn lại
-- (chạm trần số bài mỗi IP) trả về 429 mà không ghi lại gì cả, nên nó hoàn
-- toàn vô hình trên trang Thống kê.
--
-- Đó là đúng thứ nguy hiểm nhất mà lại không nhìn thấy: hạn mức ghi là trần
-- của cả trang, khó chạm; còn trần theo IP thì với người dùng 4G (vốn hàng
-- trăm thuê bao chung một địa chỉ qua CGNAT) là thứ chạm phải hằng ngày mà
-- không ai làm gì sai. Chủ trang chỉ thấy "hôm nay ít bài quá" rồi đoán là do
-- nội dung, trong khi thật ra người ta đã điền xong form và bị đuổi về.
--
-- Tách cột riêng chứ không cộng dồn vào `blocked`: hai con số này đòi hai hành
-- động khác hẳn nhau. `blocked` cao là lúc nghĩ tới chuyện đổi sang R2; cột này
-- cao là lúc nới trần trong phần Cài đặt.

ALTER TABLE daily_usage ADD COLUMN blocked_ip INTEGER NOT NULL DEFAULT 0;
