import { setProdPreview, type Me } from "./shared";

const LOGIN_ERRORS: Record<string, string> = {
	"khong-co-quyen": "Email này không nằm trong danh sách quản trị.",
	"chua-cau-hinh": "Chưa cấu hình OAuth cho nhà cung cấp đó.",
	state: "Phiên đăng nhập hết hạn. Bạn thử lại nhé.",
	"doi-ma-that-bai": "Không đổi được mã đăng nhập. Kiểm tra lại client secret.",
	"khong-doc-duoc-email": "Không đọc được email đã xác minh từ tài khoản đó.",
};

export function Login({ me }: { me: Me }) {
	const error = new URLSearchParams(window.location.search).get("error");

	return (
		<div className="login">
			<h1 style={{ fontSize: 22, margin: 0 }}>Đăng nhập quản trị</h1>
			{error && <div className="error">{LOGIN_ERRORS[error] ?? error}</div>}

			{me.prodPreview && (
				<div className="notice warn">
					<strong>Đang xem như production.</strong>
					<span>
						Đây đúng là màn hình người lạ nhìn thấy. Đăng nhập bằng nút dưới,
						hoặc quay lại chế độ phát triển.
					</span>
					<button
						type="button"
						className="cta-ghost"
						style={{ marginTop: 8 }}
						onClick={() => setProdPreview(false)}
					>
						Quay lại chế độ phát triển
					</button>
				</div>
			)}

			{!me.configured && (
				<div className="notice warn">
					<strong>Chưa đặt ADMIN_EMAILS.</strong>
					<span>
						Chạy <code>npx wrangler secret put ADMIN_EMAILS</code> rồi thử lại.
					</span>
				</div>
			)}

			{me.providers.google && (
				<a className="cta" href="/auth/google">
					Đăng nhập với Google
				</a>
			)}
			{me.providers.github && (
				<a className="cta-ghost" href="/auth/github" style={{ textAlign: "center", textDecoration: "none" }}>
					Đăng nhập với GitHub
				</a>
			)}

			{!me.providers.google && !me.providers.github && (
				<div className="notice bad">
					<strong>Chưa cấu hình đăng nhập.</strong>
					<span>Xem phần “Đăng nhập” trong README để tạo ứng dụng OAuth.</span>
				</div>
			)}
		</div>
	);
}
