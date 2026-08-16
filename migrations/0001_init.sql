-- Tuân AI: lược đồ khởi tạo
-- Ảnh nằm trong KV; bảng dưới đây chỉ giữ dữ liệu mô tả và thống kê.

CREATE TABLE submissions (
  code           TEXT PRIMARY KEY,
  nickname       TEXT NOT NULL,
  email          TEXT,
  description    TEXT NOT NULL,
  styles         TEXT NOT NULL DEFAULT '[]',
  images         TEXT NOT NULL DEFAULT '[]',
  status         TEXT NOT NULL DEFAULT 'new',
  published_url  TEXT,
  admin_note     TEXT,
  lang           TEXT NOT NULL DEFAULT 'vi',
  bytes          INTEGER NOT NULL DEFAULT 0,
  ip_hash        TEXT,
  created_at     INTEGER NOT NULL,
  expires_at     INTEGER NOT NULL,
  images_purged  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_sub_created   ON submissions (created_at DESC);
CREATE INDEX idx_sub_status    ON submissions (status, created_at DESC);
CREATE INDEX idx_sub_expiry    ON submissions (images_purged, expires_at);

CREATE TABLE styles (
  id         TEXT PRIMARY KEY,
  label_vi   TEXT NOT NULL,
  label_en   TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Một dòng cho mỗi ngày UTC. Hạn mức KV cũng reset theo giờ UTC.
CREATE TABLE daily_usage (
  day         TEXT PRIMARY KEY,
  submissions INTEGER NOT NULL DEFAULT 0,
  kv_writes   INTEGER NOT NULL DEFAULT 0,
  blocked     INTEGER NOT NULL DEFAULT 0,
  bytes       INTEGER NOT NULL DEFAULT 0
);

INSERT INTO styles (id, label_vi, label_en, sort_order) VALUES
  ('animate',   'Làm ảnh sống động', 'Bring photo to life', 1),
  ('colorize',  'Đổ màu ảnh cũ',     'Colorize old photo',  2),
  ('painting',  'Biến thành tranh vẽ','Turn into a painting',3),
  ('cinematic', 'Phong cách điện ảnh','Cinematic look',      4);
-- 0004 đổi bộ kiểu này sang hướng đồ vật. Giữ nguyên câu trên để những bản D1
-- đã chạy migration cũ và bản dựng mới đi qua đúng cùng một chuỗi thay đổi.

INSERT INTO settings (key, value) VALUES
  ('retention_days',      '7'),
  ('max_images',          '3'),
  ('daily_write_budget',  '850'),
  ('max_per_ip_day',      '3'),
  ('submissions_open',    '1'),
  ('site_title',          'Tuân AI'),
  ('tagline_vi',          'Biến ảnh tĩnh của bạn thành những video sáng tạo vui nhộn'),
  ('tagline_en',          'Turn your still photos into fun, creative videos');
