import { Link } from "react-router-dom";
import { useLang } from "../lib/lang-context";
import { SiteFooter } from "../components/Footer";
import { Wordmark, LangToggle, ThemeToggle } from "../components/Layout";
import { ArrowLeftIcon } from "../components/icons";

export function Privacy() {
	const { lang, t } = useLang();

	return (
		<div className="page">
			<header className="topbar">
				<Link className="wordmark" to="/">
					<Wordmark />
				</Link>
				<div className="topbar-tools">
					<ThemeToggle />
					<LangToggle />
				</div>
			</header>

			<article className="legal">
				<h1>{t.privacyTitle}</h1>
				<p className="legal-updated">{t.privacyUpdated}</p>

				{lang === "vi" ? <PrivacyVi /> : <PrivacyEn />}

				<div className="legal-back">
					<Link to="/" className="btn-back">
						<ArrowLeftIcon size={16} /> {t.backHome}
					</Link>
				</div>
			</article>

			<SiteFooter />
		</div>
	);
}

function PrivacyVi() {
	return (
		<>
			<section>
				<h2>1. Dữ liệu chúng tôi thu thập</h2>
				<p>
					Khi bạn gửi bài qua biểu mẫu trên trang, chúng tôi lưu lại các
					thông tin sau:
				</p>
				<ul>
					<li>
						<strong>Tên hiển thị</strong>: tên bạn muốn xuất hiện khi tác
						phẩm lên sóng.
					</li>
					<li>
						<strong>Email</strong> (không bắt buộc): nếu bạn cung cấp, chỉ
						dùng để liên hệ về bài gửi của bạn.
					</li>
					<li>
						<strong>Ảnh gốc</strong>: lưu trữ tạm thời, tự động xoá sau số
						ngày được quy định trên trang.
					</li>
					<li>
						<strong>Nội dung mô tả và phong cách</strong>: ý tưởng bạn muốn
						thực hiện.
					</li>
					<li>
						<strong>Mã băm địa chỉ IP</strong>: dùng để giới hạn số lần gửi
						bài trong ngày, không lưu IP gốc.
					</li>
				</ul>
			</section>

			<section>
				<h2>2. Mục đích sử dụng</h2>
				<ul>
					<li>Nhận và xử lý ý tưởng bạn gửi.</li>
					<li>Sản xuất nội dung video và đăng trên kênh TikTok / YouTube.</li>
					<li>Chống lạm dụng và bảo vệ dịch vụ.</li>
				</ul>
			</section>

			<section>
				<h2>3. Lưu trữ và bảo mật</h2>
				<p>
					Dữ liệu được lưu trên hạ tầng Cloudflare (Workers, D1, KV). Ảnh gốc
					tự động bị xoá sau thời hạn lưu trữ. Chúng tôi không bán hay chia sẻ
					thông tin cá nhân của bạn cho bên thứ ba, trừ khi pháp luật yêu cầu.
				</p>
			</section>

			<section>
				<h2>4. Cookie và lưu trữ trên máy</h2>
				<p>
					Trang sử dụng <code>localStorage</code> của trình duyệt để nhớ ngôn
					ngữ, bảng màu, danh sách mã bài đã gửi, cùng tên hiển thị và email
					bạn đã điền để lần sau khỏi gõ lại. Những thứ này nằm trong máy bạn,
					và nút "Xoá khỏi máy này" ở trang Bài của bạn xoá hết. Không có cookie
					theo dõi hay quảng cáo nào. Dịch vụ Turnstile của Cloudflare có thể
					đặt cookie kỹ thuật để xác minh bạn là người thật.
				</p>
			</section>

			<section>
				<h2>5. Quyền của bạn</h2>
				<p>Bạn có quyền:</p>
				<ul>
					<li>Yêu cầu xoá bài gửi và dữ liệu liên quan bất cứ lúc nào.</li>
					<li>Yêu cầu truy cập hoặc chỉnh sửa thông tin cá nhân.</li>
					<li>
						Rút lại đồng ý cho ảnh và tác phẩm xuất hiện trên kênh bằng cách
						liên hệ với chúng tôi.
					</li>
				</ul>
			</section>

			<section>
				<h2>6. Liên hệ</h2>
				<p>
					Nếu có bất kỳ thắc mắc nào về quyền riêng tư, vui lòng liên hệ qua
					kênh TikTok hoặc YouTube chính thức của Tuân AI.
				</p>
			</section>

			<section>
				<h2>7. Thay đổi chính sách</h2>
				<p>
					Chúng tôi có thể cập nhật chính sách này theo thời gian. Mọi thay đổi
					sẽ được đăng tại trang này với ngày cập nhật mới.
				</p>
			</section>
		</>
	);
}

function PrivacyEn() {
	return (
		<>
			<section>
				<h2>1. Data We Collect</h2>
				<p>When you submit an idea through our form, we store:</p>
				<ul>
					<li>
						<strong>Display name</strong>: the name you want shown when your
						piece goes live.
					</li>
					<li>
						<strong>Email</strong> (optional): used only to contact you about
						your submission.
					</li>
					<li>
						<strong>Original photos</strong>: stored temporarily and
						automatically deleted after the retention period shown on the site.
					</li>
					<li>
						<strong>Description and style preferences</strong>: your creative
						idea.
					</li>
					<li>
						<strong>Hashed IP address</strong>: used to enforce daily
						submission limits; we do not store your raw IP.
					</li>
				</ul>
			</section>

			<section>
				<h2>2. How We Use Your Data</h2>
				<ul>
					<li>Receive and process your creative ideas.</li>
					<li>
						Produce video content and publish it on our TikTok / YouTube
						channels.
					</li>
					<li>Prevent abuse and protect the service.</li>
				</ul>
			</section>

			<section>
				<h2>3. Storage and Security</h2>
				<p>
					Data is stored on Cloudflare infrastructure (Workers, D1, KV). Original
					photos are automatically deleted after the retention period. We do not
					sell or share your personal information with third parties, unless
					required by law.
				</p>
			</section>

			<section>
				<h2>4. Cookies and Local Storage</h2>
				<p>
					The site uses your browser's <code>localStorage</code> to remember your
					language preference, color theme, the list of submission codes you've
					sent, and the display name and email you filled in, so you don't have
					to type them again. All of it stays on your device, and the "Forget on
					this device" button on the Your submissions page clears it. There are
					no tracking or advertising cookies. Cloudflare Turnstile may set
					technical cookies to verify you are human.
				</p>
			</section>

			<section>
				<h2>5. Your Rights</h2>
				<p>You have the right to:</p>
				<ul>
					<li>
						Request deletion of your submissions and associated data at any
						time.
					</li>
					<li>Request access to or correction of your personal information.</li>
					<li>
						Withdraw your consent for photos and creations to appear on our
						channels by contacting us.
					</li>
				</ul>
			</section>

			<section>
				<h2>6. Contact</h2>
				<p>
					If you have any questions about privacy, please reach out through the
					official Tuân AI TikTok or YouTube channels.
				</p>
			</section>

			<section>
				<h2>7. Changes to This Policy</h2>
				<p>
					We may update this policy from time to time. Any changes will be posted
					on this page with a new effective date.
				</p>
			</section>
		</>
	);
}
