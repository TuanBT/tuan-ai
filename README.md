# Tuân AI

Hộp thu ý tưởng: người xem gửi 1–2 tấm ảnh kèm mô tả, bạn duyệt tay rồi dựng
clip AI và đăng lên kênh. Không có khâu tạo ảnh tự động, trang này chỉ nhận và
sắp xếp ý tưởng.

Chạy trọn vẹn trên gói miễn phí của Cloudflare, **không cần thẻ tín dụng**.

Đang chạy tại **<https://tuan-ai.tuanbt.workers.dev>**, khu quản trị ở `/admin`.

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
npm test               # chạy test
npm run verify         # typecheck + test + lint + build (giống hệt CI)
npm run check          # verify + thử deploy khan
npm run ship           # check + migration + deploy thật
```

`npm run dev` tự giả lập KV và D1 ngay trên máy, không đụng tới dữ liệu thật.

Lần đầu chạy cần tạo bảng cho bản D1 cục bộ:

```bash
npx wrangler d1 migrations apply tuan-ai-db --local
```

Khi chạy local, `/admin` mở sẵn nhờ `DEV_ADMIN_BYPASS` trong `.dev.vars`, không
phải dựng OAuth mới xem được. Cửa sau này khoá hai lớp: biến chỉ nằm trong
`.dev.vars` (không bao giờ được đẩy lên Cloudflare), và kể cả nếu lọt lên thì
yêu cầu vẫn buộc phải đến từ `localhost`.

Hạn mức **số bài mỗi người mỗi ngày** cũng được bỏ qua khi chạy local. Máy lập
trình không có `cf-connecting-ip` nên mọi lượt gửi mang chung một mã băm địa chỉ:
để nguyên thì gửi vài bài thử là tự khoá chính mình tới nửa đêm UTC, mà cách gỡ
duy nhất là vào tận cơ sở dữ liệu xoá bài.

### Xem thử y như production, không cần deploy

Trong `/admin` có nút **“Xem như production”**. Bấm vào là mọi nới lỏng tắt ngay
trong trình duyệt đó: bạn thấy đúng màn hình đăng nhập mà người lạ thấy, mọi API
quản trị trả về 401, và hạn mức mỗi người mỗi ngày chặn thật. Bấm **“Quay lại
chế độ phát triển”** để trở về.

Muốn thử luôn cả luồng đăng nhập thật trên máy, thêm địa chỉ localhost vào phần
callback của ứng dụng OAuth (Google và GitHub đều cho phép):

```
http://localhost:5173/auth/google/callback
http://localhost:5173/auth/github/callback
```

rồi điền `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` cùng secret tương ứng vào
`.dev.vars`. Thêm `localhost` vào Turnstile nữa là bản chạy trên máy giống
production gần như hoàn toàn.

## Đưa lên mạng

Hai cách, dùng cách nào cũng được.

**Từ máy, một lệnh:**

```bash
npm run ship
```

Nó chạy `check` (typecheck, test, lint, build, thử deploy khan) → migration D1
trên production → deploy. Nối bằng `&&` nên hỏng ở bước nào là dừng luôn, không
có chuyện deploy đè lên bản đang lỗi.

**Từ GitHub: `git push` là xong.** Workflow `.github/workflows/deploy.yml` chạy
đúng ba bước đó mỗi khi có commit mới trên `main`. Pull request thì chỉ chạy
phần kiểm tra, không deploy. Muốn deploy lại mà không cần commit mới thì vào tab
**Actions → Deploy → Run workflow**.

### Bật deploy tự động

Cần đúng hai secret trong repo. Vào **Settings → Secrets and variables →
Actions → New repository secret**:

| Tên | Giá trị |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | `0952a98c499ae4bc9a0f2dc2c4eb5341` (lấy lại bằng `npx wrangler whoami`) |
| `CLOUDFLARE_API_TOKEN` | tạo theo hướng dẫn dưới |

Tạo token: [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
→ **Create Token** → chọn mẫu **Edit Cloudflare Workers** → **Use template**.

Mẫu đó thiếu quyền D1, phải thêm tay. Trong phần *Permissions*, bấm **+ Add
more** rồi chọn:

```
Account   →   D1   →   Edit
```

Phần *Account Resources* để đúng tài khoản của bạn, rồi **Continue → Create
Token**. Token chỉ hiện **một lần**, chép ngay sang GitHub, đóng tab là mất.

Thiếu quyền D1 thì workflow chạy tới bước migration mới báo lỗi 403, còn phần
kiểm tra vẫn xanh, nên nếu thấy hỏng đúng chỗ đó thì gần như chắc chắn là quên
bước **+ Add more** ở trên.

### Bí mật thì không nằm trong GitHub

Chỉ hai secret trên nằm ở GitHub. `SESSION_SECRET`, `ADMIN_EMAILS`, khoá OAuth
và khoá Turnstile nằm sẵn trên Cloudflare qua `wrangler secret put`, và **không
lần deploy nào ghi đè chúng**. Đổi khoá thì chạy `wrangler secret put` lại, khỏi
đụng tới workflow.

## Nạp bí mật cho production

`.dev.vars` chỉ dùng khi chạy máy. Trên production nạp từng cái bằng lệnh dưới
đây, giá trị gõ vào terminal, không đi qua git:

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
   `https://tuan-ai.tuanbt.workers.dev/auth/google/callback`
5. Lấy Client ID và Client Secret nạp vào hai secret tương ứng

### Đăng nhập GitHub

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. Homepage URL: `https://tuan-ai.tuanbt.workers.dev`
3. Authorization callback URL:
   `https://tuan-ai.tuanbt.workers.dev/auth/github/callback`
4. Bấm *Generate a new client secret* rồi nạp cả hai giá trị

### Turnstile chống bot

Turnstile cho bạn **hai** khoá, và chúng đi thành cặp:

| Khoá | Nó là gì | Để đâu |
| --- | --- | --- |
| **Site Key** (`0x4AAA…`) | Công khai. Trình duyệt cần nó để vẽ ô kiểm tra. Nó nằm lộ trong mã nguồn trang, ai xem cũng thấy, đó là chuyện bình thường. | `TURNSTILE_SITE_KEY` |
| **Secret Key** | Bí mật. Máy chủ dùng nó để hỏi Cloudflare "cái token này có thật không". Lộ ra là người khác giả được lượt xác minh. | `TURNSTILE_SECRET` |

**Lấy khoá ở đâu:** dashboard Cloudflare → **Turnstile** → **Add site**. Phần
*Hostnames* thêm cả hai dòng, mỗi dòng một hostname:

```
tuan-ai.tuanbt.workers.dev
localhost
```

Thiếu `localhost` thì ô kiểm tra không chạy khi bạn `npm run dev`. Thiếu tên
miền thật thì nó không chạy trên production. Widget Mode để **Managed** là được.

**Nạp vào đâu, tuỳ nơi chạy:**

*Trên máy*: mở `.dev.vars`, điền vào hai dòng có sẵn:

```
TURNSTILE_SITE_KEY="0x4AAAAAAA..."
TURNSTILE_SECRET="0x4AAAAAAA..."
```

File này đã nằm trong `.gitignore`, không bao giờ lên git. (Máy bạn đang có sẵn
cả hai khoá rồi.)

*Trên production*: gõ hai lệnh này, mỗi lệnh sẽ hỏi giá trị rồi bạn dán vào.
Giá trị đi thẳng lên Cloudflare, không qua git:

```bash
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET
```

Site Key vốn công khai nên để nó trong `wrangler.json` cũng chẳng sao, nhưng
để cả hai cùng một chỗ thì bạn khỏi phải nhớ cái nào nằm đâu, và khỏi nạp thiếu
một nửa.

**Kiểm tra đã ăn chưa:** vào `/admin` → tab **Thống kê**. Có cảnh báo đỏ *"Chưa
bật chống bot"* nghĩa là `TURNSTILE_SECRET` chưa tới nơi.

**Thiếu khoá thì trang tự đóng form.** Trước đây thiếu secret là bước kiểm tra
bị bỏ qua hoàn toàn: quên một lệnh `wrangler secret put` là form mở toang cho
bot mà chẳng có gì báo. Giờ thì ngược lại, chạy thật mà không có secret thì
`/api/submit` trả 503 và trang chủ hiện lời xin lỗi tử tế. Mất vài bài còn hơn
để bot đổ đầy hộp thư. Chạy trên `localhost` thì vẫn được bỏ qua như cũ, để bạn
phát triển không vướng.

---

## Vận hành

Trang `/admin` có năm mục. Mọi thứ chỉnh được ở đây, không cần mở dashboard
Cloudflare.

- **Bài gửi**: duyệt tay, đánh dấu *Mới / Đã chọn / Đã lên sóng / Bỏ qua*, **tải
  gói làm việc** (xem bên dưới), dán link TikTok và link YouTube khi đã đăng
  (mỗi kênh một ô riêng, vì một bài thường lên cả hai), xoá vĩnh viễn bài rác
- **Thống kê**: mức dùng hạn mức, dung lượng, và **số lượt bị chặn**
- **Kiểu**: thêm bớt các lựa chọn người dùng thấy khi gửi bài
- **Cài đặt**: số ngày giữ ảnh, số ngày giữ dữ liệu mô tả, số ảnh mỗi bài,
  ngân sách ghi, số bài mỗi người mỗi ngày, bật tắt nhận bài, tên, câu giới
  thiệu, và **link kênh TikTok / YouTube** (để trống thì trang giấu nút đi; chỉ
  nhận `http://` hoặc `https://`)
- **Dữ liệu**: số dòng từng bảng, dọn ảnh quá hạn ngay, tải toàn bộ bài gửi ra
  CSV, ô chạy câu truy vấn, và vùng nguy hiểm để xoá thống kê hoặc dọn sạch dữ
  liệu thử

Mỗi tab có địa chỉ riêng (`/admin#data`), tải lại trang không bị nhảy về đầu.

### Gói làm việc

Duyệt bài xong thì phải mang ảnh và mô tả sang công cụ dựng clip. Thay vì bấm
từng ảnh ra tab mới rồi chuột phải lưu, mỗi thẻ bài có nút **Tải gói**, và trên
đầu hộp thư có nút tải cả đợt đang lọc (tối đa 25 bài một lượt).

Gói một bài (`ta-04716598.zip`):

```
01.jpg              ảnh gốc, đánh số theo thứ tự người gửi
02.png
noi-dung.txt        để đọc và chép: người gửi, ngày, kiểu đã chọn, và
                    phần mô tả nằm riêng một khối giữa hai đường kẻ
noi-dung.json       cùng dữ liệu đó dạng máy đọc, để nối sang chỗ khác
```

Gói cả đợt thì mỗi bài một thư mục mang tên mã bài, kèm `danh-sach.txt` ở gốc
làm mục lục. Bài đã hết hạn ảnh vẫn tải được, chỉ là trong gói không có ảnh và
`noi-dung.txt` nói rõ điều đó.

Zip dựng theo luồng, không nén — ảnh JPEG/PNG/WebP đã nén sẵn nên nén thêm chỉ
tốn CPU — và mỗi lúc chỉ giữ một tấm ảnh trong bộ nhớ, để gói cả đợt không chạm
trần 128 MB của Worker.

### Ô truy vấn chỉ cho phép đọc

Chỉ chạy được `SELECT` (và `WITH`). Câu lệnh sửa hay xoá bị chặn ngay ở máy chủ,
kể cả khi cố nối nhiều câu bằng dấu chấm phẩy. Lý do: một câu `UPDATE` gõ nhầm
là mất dữ liệu không hoàn tác, và nếu tài khoản quản trị bị chiếm thì ô này
thành cửa mở toang. Câu nào thiếu `LIMIT` sẽ được tự thêm `LIMIT 200`.

Việc sửa dữ liệu nằm ở các nút bảo trì, vì chúng biết phải dọn cả ảnh trong kho
chứ không chỉ xoá dòng trong bảng.

### Hạn mức và lúc nào nên chuyển sang R2

KV miễn phí cho 1.000 lượt ghi mỗi ngày UTC và 1 GB dung lượng. Mỗi tấm ảnh tốn
một lượt ghi, nên ngân sách mặc định 850 tương đương khoảng **280 bài ba ảnh mỗi
ngày**. Chạm ngưỡng thì form hiện lời hẹn kèm đồng hồ đếm ngược thay vì báo lỗi.

Ngày reset tính theo giờ UTC, tức **7 giờ sáng giờ Việt Nam**.

Mỗi lượt bị chặn đều được ghi lại. Khi Thống kê báo **ba ngày liên tiếp có lượt
bị chặn**, nghĩa là đang mất bài thật, lúc đó mới đáng bật R2:

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

### Dữ liệu tự xoá

Hai mốc thời gian, hai việc khác nhau:

**Ảnh: mặc định 7 ngày.** Ảnh gắn TTL đúng bằng số ngày trong Cài đặt, KV tự
xoá khi hết hạn mà không tốn hạn mức xoá.

**Email: mặc định 90 ngày.** Sau ngần này ngày kể từ lúc gửi, email và dấu vết
địa chỉ mạng của bài bị xoá khỏi D1, mọi bài như nhau.

Phần còn lại của dòng — tên hiển thị, mô tả, kiểu đã chọn, trạng thái, link đã
đăng — thì ở lại. Một dòng như vậy chỉ nặng vài trăm byte, trong khi xoá nó biến
việc tra mã thành ngõ cụt đúng với người không được chọn: cầm mã trong tay, gõ
vào, nhận về "không tìm thấy". Giữ lại thì một năm sau người gửi vẫn tra được
bài mình và link clip nếu có; ảnh gốc thì không, vì ảnh đã đi theo mốc bên trên.

Muốn giữ thông tin liên lạc lâu hơn thì nâng số ngày lên, hoặc xuất CSV trước.

Bản quét cron chạy 01:00 giờ Việt Nam mỗi đêm lo cả hai việc trên, cộng thêm dọn
bộ đếm chặn dò mã cũ hơn 7 ngày. Bấm tay được từ tab **Dữ liệu**.

---

## Cấu trúc

```
src/worker/
  index.ts              gắn route, cron dọn dữ liệu quá hạn
  lib/storage.ts        tầng lưu ảnh, đổi KV ↔ R2 ở đây
  lib/quota.ts          đếm mức dùng theo ngày, ngưỡng mềm
  lib/settings.ts       đọc ghi cấu hình, có chặn giá trị vô lý
  lib/session.ts        cookie phiên ký bằng HMAC
  lib/purge.ts          bản quét đêm: ảnh, dòng quá hạn, bộ đếm dò mã
  lib/headers.ts        CSP và các header bảo mật cho phần API
  routes/public.ts      cấu hình, gửi bài, tra cứu, phục vụ ảnh
  routes/admin.ts       duyệt bài, thống kê, kiểu, cài đặt
  routes/auth.ts        OAuth Google và GitHub

src/react-app/
  pages/Submit.tsx      trang gửi bài
  pages/Lookup.tsx      tra cứu theo mã + danh sách "Bài của bạn"
  pages/Admin.tsx       khung khu quản trị
  pages/admin/          từng tab một file
  components/Layout.tsx khung chung: điều hướng, chuyển ngôn ngữ, chân trang
  components/Channels.tsx nút sang kênh TikTok / YouTube
  components/Lightbox.tsx khung xem ảnh toàn màn hình
  lib/image-viewer.tsx  móc nối mở khung xem ảnh từ bất kỳ trang nào
  lib/site-config.ts    cấu hình trang, tải một lần dùng chung
  lib/compress.ts       nén ảnh trong trình duyệt trước khi gửi
  lib/mine.ts           danh sách mã bài lưu trong máy người dùng
  lib/styles.ts         đổi mã kiểu thành tên đọc được, theo ngôn ngữ
  lib/local.ts          localStorage không bao giờ ném lỗi
  lib/i18n.ts           toàn bộ chữ tiếng Việt và tiếng Anh

public/_headers         header bảo mật cho phần tĩnh (không đi qua Worker)
test/                   test cho phần logic dễ hỏng âm thầm
```

Header bảo mật nằm ở **hai** nơi vì file tĩnh được phục vụ thẳng từ biên
Cloudflare, không đi qua Worker. Sửa `src/worker/lib/headers.ts` thì sửa luôn
`public/_headers` cho khớp; `test/headers.test.ts` so hai bên và báo đỏ nếu lệch.

### Thêm route mới thì nhớ `run_worker_first`

Worker và tầng static asset dùng chung một không gian đường dẫn, và **asset
được ưu tiên trước**. Vì `not_found_handling` để `single-page-application`, mọi
điều hướng không khớp file tĩnh đều nhận `index.html`, kể cả `/auth/google`.

Cái bẫy: `curl` trần thì Worker vẫn trả lời đúng, chỉ trình duyệt mới hỏng, vì
trình duyệt gửi `Accept: text/html`. Triệu chứng là bấm nút đăng nhập rồi bị đá
về trang chủ: React Router thấy đường lạ nên rơi vào `path="*"`.

Danh sách giành lại nằm trong `wrangler.json`:

```json
"run_worker_first": ["/api/*", "/auth/*", "/i/*"]
```

Thêm tiền tố route mới cho Worker thì phải thêm vào đây. `test/routing.test.ts`
quét mã nguồn trong `src/worker/routes/` và bắt lỗi nếu bạn quên.

## Vài quyết định thiết kế

**Nén ảnh ở trình duyệt.** Ảnh 3–5 MB co còn 200–300 KB trước khi rời máy người
dùng. Đây là lý do dung lượng và băng thông không bao giờ thành vấn đề.

**Mã bài chính là chìa khoá.** Không có tài khoản người dùng. Ai giữ mã
`TA-87418644` thì xem được bài đó, đỡ phải lưu mật khẩu của người lạ.

Mã hiển thị đầy đủ cả tiền tố để người dùng biết mã thật của mình, nhưng trong ô
tra cứu thì `TA-` được gắn cứng sẵn nên **họ chỉ phải gõ tám chữ số**. Ô nhập tự
lọc, nên dán cả `TA-87418644` hay `TA 874 186 44` đều ra đúng mã. Máy chủ chấp
nhận cả hai dạng, vì vậy `/r/87418644` và `/r/TA-87418644` đều mở được.

Tiền tố cũng có việc của nó: nó giữ cho Excel không hiểu mã thành con số rồi
nuốt mất số 0 ở đầu khi bạn xuất CSV.

Vì mã là chìa khoá nên nó **sinh ngẫu nhiên, không chạy theo thứ tự**: 100 triệu
tổ hợp, và biết một mã cũng không đoán được mã kế bên. Kèm theo đó, ai tra sai
quá 30 lần trong một ngày sẽ bị khoá, chặn việc dò mã hàng loạt. Bộ đếm này
tính cả đường lấy ảnh (`/i/…`) chứ không riêng ô tra cứu; ảnh mới là thứ đáng
giá, khoá cửa trước mà để ngỏ cửa sau thì bằng thừa.

**Trình duyệt nhớ hộ mã.** Gửi bài xong, mã được lưu vào `localStorage` của
chính máy người dùng, và trang `/r` hiện danh sách "Bài của bạn" để họ bấm vào
là mở lại. Không có tài khoản, nên trước đó mất mã là mất bài vĩnh viễn.

Chỗ này không làm yếu bảo mật: người vừa mở `/r/TA-87418644` thì mã đã nằm trong
lịch sử trình duyệt rồi, đây chỉ là cái bookmark tự động. Chỉ lưu **mã và tên
hiển thị**, không bao giờ lưu ảnh, mô tả hay email; trạng thái bài luôn hỏi lại
máy chủ vì nó đổi khi bạn duyệt.

Và nó là tiện ích chứ không phải nơi cất giữ. Safari xoá storage sau 7 ngày
không ai vào trang, chưa kể chế độ ẩn danh, dọn dữ liệu duyệt web hay đổi máy,
nên màn hình gửi bài xong vẫn phô mã ra và vẫn khuyên chụp màn hình. Có nút
**"Xoá khỏi máy này"** cho người dùng máy chung.

**Không tự động công khai.** Không có gì hiện ra ngoài cho tới khi bạn tự tay
đánh dấu và dán link. Đây là lớp bảo vệ quan trọng nhất khi mở form cho công
chúng.

**Chỉ lưu IP đã băm.** Dùng để đếm và chặn lạm dụng, không lưu địa chỉ thật.

**Dữ liệu người lạ không giữ mãi.** Ảnh đi sau 7 ngày, phần mô tả đi sau 90
ngày. Xem mục "Dữ liệu tự xoá" ở trên.

**Thà đóng form còn hơn mở toang.** Chưa cấu hình chống bot thì trang từ chối
nhận bài, chứ không nhận rồi bỏ qua bước kiểm tra.
