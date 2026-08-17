-- Đổi nhãn phó mặc từ "Để Tuân tự quyết" thành "Để Tuân AI tự quyết" và
-- "Let Tuân decide" thành "Let Tuân AI decide" cho rõ ràng hơn.
--
-- Điều kiện WHERE giữ nguyên chỗ chủ trang đã tự sửa nhãn qua /admin.

UPDATE styles SET label_vi = 'Để Tuân AI tự quyết'
  WHERE id = 'surprise'
    AND label_vi = 'Để Tuân tự quyết';

UPDATE styles SET label_en = 'Let Tuân AI decide'
  WHERE id = 'surprise'
    AND label_en = 'Let Tuân decide';
