-- Kênh xoay sang đồ vật vô tri: tranh vẽ, món đồ, đồ chơi biết cựa quậy, chứ
-- không phải ảnh gia đình. Bộ kiểu và câu giới thiệu mặc định phải nói đúng
-- điều đó, nếu không người gửi cứ gửi ảnh người.
--
-- Mọi câu UPDATE dưới đây đều kèm điều kiện "giá trị vẫn đúng như bản gốc":
-- chỗ nào chủ trang đã tự sửa trong /admin thì migration không đụng vào.

UPDATE settings SET value = 'Biến đồ vật vô tri thành clip sống động, vui nhộn'
  WHERE key = 'tagline_vi'
    AND value = 'Biến ảnh tĩnh của bạn thành những video sáng tạo vui nhộn';

UPDATE settings SET value = 'Turn lifeless objects into lively, funny clips'
  WHERE key = 'tagline_en'
    AND value = 'Turn your still photos into fun, creative videos';

UPDATE styles SET label_vi = 'Cho cựa quậy, sống dậy', label_en = 'Bring it to life'
  WHERE id = 'animate' AND label_vi = 'Làm ảnh sống động';

UPDATE styles SET label_vi = 'Tranh vẽ động đậy', label_en = 'Painting comes alive'
  WHERE id = 'painting' AND label_vi = 'Biến thành tranh vẽ';

-- Đổ màu ảnh cũ là kiểu của thời làm ảnh gia đình. Tắt chứ không xoá: bật lại
-- chỉ mất một cú bấm trong /admin, còn xoá rồi thì bài cũ mất luôn tên kiểu.
UPDATE styles SET active = 0
  WHERE id = 'colorize' AND label_vi = 'Đổ màu ảnh cũ';

INSERT INTO styles (id, label_vi, label_en, sort_order) VALUES
  ('dance', 'Nhảy múa tưng bừng',   'Make it dance',      2),
  ('face',  'Gắn mặt biểu cảm',     'Give it a face',     3),
  ('story', 'Kể một câu chuyện nhỏ', 'Tell a little story', 5)
  ON CONFLICT(id) DO NOTHING;

UPDATE styles SET sort_order = 1 WHERE id = 'animate';
UPDATE styles SET sort_order = 4 WHERE id = 'painting';
UPDATE styles SET sort_order = 6 WHERE id = 'cinematic';
