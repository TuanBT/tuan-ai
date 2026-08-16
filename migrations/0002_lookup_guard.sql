-- Chặn dò mã hàng loạt.
--
-- Mã bài chính là chìa khoá xem ảnh, nên phải giới hạn số lần đoán sai. Chỉ đếm
-- lần tra trượt; tra đúng mã của mình bao nhiêu lần cũng được.

CREATE TABLE lookup_misses (
  ip_hash TEXT NOT NULL,
  day     TEXT NOT NULL,
  misses  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, day)
);
