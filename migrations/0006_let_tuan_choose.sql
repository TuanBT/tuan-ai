-- Hai việc: câu giới thiệu ngắn lại, và thêm lối ra cho người không biết chọn gì.
--
-- Phần lớn người gửi chỉ có tấm ảnh trong tay, chưa hình dung được clip sẽ ra
-- sao. Bắt họ nghĩ ra một "kiểu" trước khi gửi là chỗ dễ bỏ cuộc nhất, nên bộ
-- kiểu cần vài lựa chọn không đòi hỏi tưởng tượng gì cả.
--
-- Điều kiện "giá trị vẫn đúng như bản trước" giữ nguyên chỗ chủ trang đã tự sửa.
-- Câu dưới đây bắt vào kết quả của 0004, nên cả bản D1 mới tinh (chạy 0004 rồi
-- 0006) lẫn bản đã chạy 0004 từ trước đều ra cùng một chỗ.

UPDATE settings SET value = 'Cho đồ vật vô tri sống dậy'
  WHERE key = 'tagline_vi'
    AND value = 'Biến đồ vật vô tri thành clip sống động, vui nhộn';

UPDATE settings SET value = 'Bring lifeless objects to life'
  WHERE key = 'tagline_en'
    AND value = 'Turn lifeless objects into lively, funny clips';

-- Thứ tự âm để ba lựa chọn này đứng trước mà không phải đánh số lại những kiểu
-- đã có, vì chủ trang có thể đã tự sắp xếp lại chúng trong /admin.
INSERT INTO styles (id, label_vi, label_en, sort_order) VALUES
  ('surprise', 'Để Tuân tự quyết',    'Let Tuân decide',   -3),
  ('funny',    'Miễn sao thật vui',   'Just make it funny', -2),
  ('cute',     'Nhẹ nhàng, dễ thương', 'Soft and cute',      -1)
  ON CONFLICT(id) DO NOTHING;
