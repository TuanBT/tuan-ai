import { Link } from "react-router-dom";
import { useLang } from "../lib/lang-context";
import { Wordmark, LangToggle, ThemeToggle } from "../components/Layout";
import { ArrowLeftIcon } from "../components/icons";

export function Terms() {
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
				<h1>{t.termsTitle}</h1>
				<p className="legal-updated">{t.termsUpdated}</p>

				{lang === "vi" ? <TermsVi /> : <TermsEn />}

				<div className="legal-back">
					<Link to="/" className="btn-back">
						<ArrowLeftIcon size={16} /> {t.backHome}
					</Link>
				</div>
			</article>

			<footer className="footer">
				<div className="footer-base">
					<span>© {new Date().getFullYear()} Tuân AI</span>
					<div className="footer-links">
						<Link to="/privacy">{t.privacyTitle}</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}

function TermsVi() {
	return (
		<>
			<section>
				<h2>1. Chấp nhận điều khoản</h2>
				<p>
					Bằng việc truy cập và sử dụng trang Tuân AI, bạn đồng ý tuân theo các
					điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng dịch
					vụ.
				</p>
			</section>

			<section>
				<h2>2. Mô tả dịch vụ</h2>
				<p>
					Tuân AI là nền tảng cho phép người dùng gửi ảnh kèm ý tưởng sáng tạo.
					Chúng tôi sẽ chọn lọc và sản xuất video từ các ý tưởng được chọn, sau
					đó đăng trên kênh TikTok và YouTube.
				</p>
			</section>

			<section>
				<h2>3. Nội dung người dùng gửi</h2>
				<ul>
					<li>
						Bạn cam kết rằng ảnh và ý tưởng bạn gửi là của bạn hoặc bạn có
						quyền sử dụng.
					</li>
					<li>
						Không gửi nội dung vi phạm pháp luật, nhạy cảm, bạo lực, hoặc ảnh
						trẻ em.
					</li>
					<li>
						Khi bấm gửi và đánh dấu đồng ý, bạn cấp cho chúng tôi quyền sử
						dụng ảnh và ý tưởng để sản xuất và đăng tải nội dung trên các kênh
						của Tuân AI.
					</li>
					<li>
						Bạn có thể rút lại đồng ý bất cứ lúc nào bằng cách liên hệ với
						chúng tôi.
					</li>
				</ul>
			</section>

			<section>
				<h2>4. Quyền sở hữu trí tuệ</h2>
				<p>
					Bạn giữ nguyên quyền sở hữu đối với ảnh gốc bạn gửi. Tác phẩm video
					được tạo ra từ ý tưởng của bạn thuộc quyền sở hữu của Tuân AI. Tên
					hiển thị của bạn sẽ được ghi nhận trong tác phẩm khi lên sóng.
				</p>
			</section>

			<section>
				<h2>5. Giới hạn trách nhiệm</h2>
				<ul>
					<li>
						Dịch vụ được cung cấp "nguyên trạng" (as-is), không kèm bảo đảm
						nào.
					</li>
					<li>
						Chúng tôi không chịu trách nhiệm cho bất kỳ thiệt hại nào phát
						sinh từ việc sử dụng dịch vụ.
					</li>
					<li>
						Ảnh gốc sẽ tự động bị xoá sau thời hạn lưu trữ và không thể khôi
						phục.
					</li>
					<li>
						Chúng tôi có quyền từ chối bất kỳ bài gửi nào mà không cần nêu lý
						do.
					</li>
				</ul>
			</section>

			<section>
				<h2>6. Chống lạm dụng</h2>
				<p>
					Để bảo vệ dịch vụ, chúng tôi giới hạn số lần gửi bài và tra cứu mỗi
					ngày cho mỗi người dùng. Lạm dụng có thể dẫn đến bị chặn truy cập tạm
					thời.
				</p>
			</section>

			<section>
				<h2>7. Thay đổi dịch vụ</h2>
				<p>
					Chúng tôi có quyền tạm ngưng, thay đổi hoặc chấm dứt dịch vụ bất cứ
					lúc nào mà không cần báo trước.
				</p>
			</section>

			<section>
				<h2>8. Thay đổi điều khoản</h2>
				<p>
					Các điều khoản này có thể được cập nhật. Phiên bản mới nhất luôn có
					sẵn tại trang này. Việc tiếp tục sử dụng dịch vụ sau khi thay đổi
					đồng nghĩa với việc bạn chấp nhận điều khoản mới.
				</p>
			</section>

			<section>
				<h2>9. Liên hệ</h2>
				<p>
					Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ qua kênh TikTok hoặc
					YouTube chính thức của Tuân AI.
				</p>
			</section>
		</>
	);
}

function TermsEn() {
	return (
		<>
			<section>
				<h2>1. Acceptance of Terms</h2>
				<p>
					By accessing and using the Tuân AI website, you agree to be bound by
					the following terms. If you do not agree, please stop using the
					service.
				</p>
			</section>

			<section>
				<h2>2. Service Description</h2>
				<p>
					Tuân AI is a platform that allows users to submit photos along with
					creative ideas. We select and produce videos from chosen ideas and
					publish them on our TikTok and YouTube channels.
				</p>
			</section>

			<section>
				<h2>3. User-Submitted Content</h2>
				<ul>
					<li>
						You confirm that the photos and ideas you submit are yours or that
						you have the right to use them.
					</li>
					<li>
						Do not submit illegal, sensitive, violent content, or images of
						children.
					</li>
					<li>
						By submitting and checking the consent box, you grant us the right
						to use your photos and ideas to produce and publish content on Tuân
						AI's channels.
					</li>
					<li>
						You may withdraw your consent at any time by contacting us.
					</li>
				</ul>
			</section>

			<section>
				<h2>4. Intellectual Property</h2>
				<p>
					You retain ownership of the original photos you submit. Video works
					created from your ideas are owned by Tuân AI. Your display name will be
					credited in the work when it goes live.
				</p>
			</section>

			<section>
				<h2>5. Limitation of Liability</h2>
				<ul>
					<li>The service is provided "as-is" with no warranties of any kind.</li>
					<li>
						We are not liable for any damages arising from your use of the
						service.
					</li>
					<li>
						Original photos are automatically deleted after the retention
						period and cannot be recovered.
					</li>
					<li>
						We reserve the right to reject any submission without giving a
						reason.
					</li>
				</ul>
			</section>

			<section>
				<h2>6. Abuse Prevention</h2>
				<p>
					To protect the service, we limit the number of daily submissions and
					lookups per user. Abuse may result in temporary access restrictions.
				</p>
			</section>

			<section>
				<h2>7. Changes to the Service</h2>
				<p>
					We reserve the right to pause, modify, or terminate the service at any
					time without prior notice.
				</p>
			</section>

			<section>
				<h2>8. Changes to These Terms</h2>
				<p>
					These terms may be updated. The latest version is always available on
					this page. Continued use of the service after changes constitutes
					acceptance of the new terms.
				</p>
			</section>

			<section>
				<h2>9. Contact</h2>
				<p>
					If you have any questions, please reach out through the official Tuân
					AI TikTok or YouTube channels.
				</p>
			</section>
		</>
	);
}
