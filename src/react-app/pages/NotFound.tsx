import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useLang } from "../lib/lang-context";

/**
 * Đường dẫn không có thật.
 *
 * Trước đây mọi đường lạ đều bị đá thẳng về trang chủ. Nhìn thì gọn, nhưng người
 * bấm vào một link gõ sai chỉ thấy mình đang ở trang chủ mà không hiểu vì sao —
 * tưởng link đúng, tưởng bài của mình biến mất. Nói thẳng ra là không có trang
 * đó, rồi chỉ hai đường đi tiếp, thì đỡ hoang mang hơn nhiều.
 *
 * Đây là 404 mềm: tầng phục vụ file tĩnh trả `index.html` kèm mã 200 cho mọi
 * đường không khớp, nên máy chủ không có cách nào biết trước đường nào là thật.
 * Thẻ `noindex` bên dưới là thứ thay cho mã 404 khi nói chuyện với máy tìm kiếm.
 */
export function NotFound() {
	const { t } = useLang();

	useEffect(() => {
		const meta = document.createElement("meta");
		meta.name = "robots";
		meta.content = "noindex";
		document.head.appendChild(meta);
		// Gỡ khi rời trang: React Router không tải lại tài liệu, để lại thì cả
		// những trang thật người dùng bấm sang sau đó cũng mang thẻ noindex.
		return () => meta.remove();
	}, []);

	return (
		<Layout>
			<div className="panel">
				<span className="badge">{t.notFoundBadge}</span>
				<h2>{t.notFoundTitle}</h2>
				<p>{t.notFoundBody}</p>
				<div className="panel-actions">
					<Link className="cta" to="/">
						{t.navSubmit}
					</Link>
					<Link className="cta-ghost" to="/r">
						{t.navMine}
					</Link>
				</div>
			</div>
		</Layout>
	);
}
