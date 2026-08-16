# Tuân AI

Hộp thu ý tưởng: người xem gửi 1–3 tấm ảnh kèm mô tả, bạn duyệt tay rồi dựng
clip AI và đăng lên kênh. Không có khâu tạo ảnh tự động — trang này chỉ nhận và
sắp xếp ý tưởng.

Chạy trọn vẹn trên gói miễn phí của Cloudflare, **không cần thẻ tín dụng**.

| Thành phần | Vai trò |
| --- | --- |
| Workers + static assets | Trang React và API trong cùng một lần deploy |
| Workers KV | Kho ảnh (đổi sang R2 được khi cần) |
| D1 | Bài gửi, cấu hình, kiểu, thống kê |
| Turnstile | Chống bot |
| Cron trigger | Dọn ảnh quá hạn mỗi đêm |

---

## Yêu cầu Node 22

Wrangler cần Node ≥ 22. Máy này đang để `node` mặc định là bản 20, nên Node 22
được cài riêng dạng keg-only và phải thêm vào `PATH` trước khi chạy lệnh:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```

Thêm dòng đó vào `~/.zshrc` nếu muốn khỏi gõ lại mỗi lần. Muốn dùng Node 22 làm
mặc định cho mọi project thì chạy `brew link --overwrite node@22`.

## Chạy trên máy

```bash
npm install
npm run dev            # http://localhost:5173
```

`npm run dev` tự giả lập KV và D1 ngay trên máy, không đụng tới dữ liệu thật.

Lần đầu chạy cần tạo bảng cho bản D1 cục bộ:

```bash
npx wrangler d1 migrations apply tuan-ai-db --local
```

Khi chạy local, `/admin` mở sẵn nhờ `DEV_ADMIN_BYPASS` trong `.dev.vars` — không
phải dựng OAuth mới xem được. Cửa sau này khoá hai lớp: biến chỉ nằm trong
`.dev.vars` (không bao giờ được đẩy lên Cloudflare), và kể cả nếu lọt lên thì
yêu cầu vẫn buộc phải đến từ `localhost`.

## Đưa lên mạng

```bash
npx wrangler d1 migrations apply tuan-ai-db --remote   # chỉ lần đầu
npm run deploy
```

## Nạp bí mật cho production

`.dev.vars` chỉ dùng khi chạy máy. Trên production nạp từng cái bằng lệnh dưới
đây — giá trị gõ vào terminal, không đi qua git:

```bash
npx wrangler secret put SESSION_SECRET     # openssl rand -hex 32
npx wrangler secret put ADMIN_EMAILS       # email được vào /admin, cách nhau bằng dấu phẩy
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

**Đừng bao giờ** đặt `DEV_ADMIN_BYPASS` bằng `wrangler secret put`.

### Đăng nhập Google

1. [Google Cloud Console](https://console.cloud.google.com/) → tạo project
2. **APIs & Services → OAuth consent screen** → chọn *External*, điền tên ứng
   dụng, thêm email của bạn vào phần *Test users*
3. **Credentials → Create credentials → OAuth client ID** → loại *Web application*
4. Mục **Authorized redirect URIs** thêm chính xác:
   `https://tuan-ai.bttvn-4t.workers.dev/auth/google/callback`
5. Lấy Client ID và Client Secret nạp vào hai secret tương ứng

### Đăng nhập GitHub

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. Homepage URL: `https://tuan-ai.bttvn-4t.workers.dev`
3. Authorization callback URL:
   `https://tuan-ai.bttvn-4t.workers.dev/auth/github/callback`
4. Bấm *Generate a new client secret* rồi nạp cả hai giá trị

### Turnstile

Dashboard Cloudflare → **Turnstile → Add site**, phần Hostnames thêm cả
`tuan-ai.bttvn-4t.workers.dev` lẫn `localhost`. Site Key là công khai, Secret
Key thì nạp bằng `wrangler secret put`.

Chưa đặt `TURNSTILE_SECRET` thì bước kiểm tra bị bỏ qua và trang Thống kê sẽ
hiện cảnh báo.

---

## Vận hành

Trang `/admin` có bốn mục:

- **Bài gửi** — duyệt tay: đánh dấu *Mới / Đã chọn / Đã lên sóng / Bỏ qua*, dán
  link TikTok hoặc YouTube khi đã đăng, xoá vĩnh viễn bài rác
- **Thống kê** — mức dùng hạn mức, dung lượng, và **số lượt bị chặn**
- **Kiểu** — thêm bớt các lựa chọn người dùng thấy khi gửi bài
- **Cài đặt** — số ngày giữ ảnh, số ảnh mỗi bài, ngân sách ghi, số bài mỗi
  người mỗi ngày, bật tắt nhận bài, tên và câu giới thiệu

### Hạn mức và lúc nào nên chuyển sang R2

KV miễn phí cho 1.000 lượt ghi mỗi ngày UTC và 1 GB dung lượng. Mỗi tấm ảnh tốn
một lượt ghi, nên ngân sách mặc định 850 tương đương khoảng **280 bài ba ảnh mỗi
ngày**. Chạm ngưỡng thì form hiện lời hẹn kèm đồng hồ đếm ngược thay vì báo lỗi.

Ngày reset tính theo giờ UTC, tức **7 giờ sáng giờ Việt Nam**.

Mỗi lượt bị chặn đều được ghi lại. Khi Thống kê báo **ba ngày liên tiếp có lượt
bị chặn**, nghĩa là đang mất bài thật — lúc đó mới đáng bật R2:

1. Bật R2 trong dashboard Cloudflare (chỗ này cần thẻ)
2. `npx wrangler login` lại để token có thêm quyền R2
3. `npx wrangler r2 bucket create tuan-ai-uploads`
4. Thêm vào `wrangler.json`:
   ```json
   "r2_buckets": [{ "binding": "UPLOADS", "bucket_name": "tuan-ai-uploads" }]
   ```
5. Trong `src/worker/lib/storage.ts`, sửa hàm `blobs` thành
   `return r2Blobs(env.UPLOADS)`
6. `npx wrangler types && npm run deploy`

Ảnh cũ vẫn nằm trong KV và tự hết hạn theo TTL; ảnh mới đi thẳng vào R2.

### Ảnh tự xoá

Ảnh gắn TTL đúng bằng số ngày trong Cài đặt (mặc định 7), KV tự xoá khi hết hạn
mà không tốn hạn mức xoá. Ngoài ra có một cron chạy 01:00 giờ Việt Nam mỗi đêm
để đánh dấu vào D1 và dọn sớm những bài vừa bị rút ngắn thời hạn lưu.

---

## Cấu trúc

```
src/worker/
  index.ts              gắn route, cron dọn ảnh quá hạn
  lib/storage.ts        tầng lưu ảnh — đổi KV ↔ R2 ở đây
  lib/quota.ts          đếm mức dùng theo ngày, ngưỡng mềm
  lib/settings.ts       đọc ghi cấu hình, có chặn giá trị vô lý
  lib/session.ts        cookie phiên ký bằng HMAC
  routes/public.ts      cấu hình, gửi bài, tra cứu, phục vụ ảnh
  routes/admin.ts       duyệt bài, thống kê, kiểu, cài đặt
  routes/auth.ts        OAuth Google và GitHub

src/react-app/
  pages/Submit.tsx      trang gửi bài
  pages/Lookup.tsx      tra cứu theo mã
  pages/Admin.tsx       khu quản trị
  lib/compress.ts       nén ảnh trong trình duyệt trước khi gửi
  lib/i18n.ts           toàn bộ chữ tiếng Việt và tiếng Anh
```

## Vài quyết định thiết kế

**Nén ảnh ở trình duyệt.** Ảnh 3–5 MB co còn 200–300 KB trước khi rời máy người
dùng. Đây là lý do dung lượng và băng thông không bao giờ thành vấn đề.

**Mã bài chính là chìa khoá.** Không có tài khoản người dùng. Ai giữ mã
`TA-04829173` thì xem được bài đó — đỡ phải lưu mật khẩu của người lạ.

Vì mã là chìa khoá nên nó dài 8 chữ số và **sinh ngẫu nhiên, không chạy theo
thứ tự**: 100 triệu tổ hợp, và biết một mã cũng không đoán được mã kế bên. Kèm
theo đó, ai tra sai quá 30 lần trong một ngày sẽ bị khoá — chặn việc dò mã hàng
loạt. Người dùng gõ mỗi phần số cũng tra được, không cần gõ `TA-`.

**Không tự động công khai.** Không có gì hiện ra ngoài cho tới khi bạn tự tay
đánh dấu và dán link. Đây là lớp bảo vệ quan trọng nhất khi mở form cho công
chúng.

**Chỉ lưu IP đã băm.** Dùng để đếm và chặn lạm dụng, không lưu địa chỉ thật.
