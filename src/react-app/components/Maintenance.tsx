import type { ReactNode } from "react";
import { useLang } from "../lib/lang-context";
import { useSiteConfig } from "../lib/site-config";
import { Layout } from "./Layout";

/**
 * Hàng rào bảo trì cho những trang có chạm tới dữ liệu.
 *
 * Chỉ bọc trang gửi bài và trang tra cứu. Điều khoản và quyền riêng tư là chữ
 * tĩnh, không hỏi máy chủ câu nào, mà lại là thứ người ta có quyền đọc bất cứ
 * lúc nào; đóng luôn cả hai trang đó là đóng thừa. `/admin` cũng phải mở, nếu
 * không thì bật bảo trì lên rồi không còn đường nào tắt đi.
 *
 * Đây là lớp lịch sự, không phải lớp bảo vệ: thứ thật sự dừng trang là hàng rào
 * 503 trong Worker. Người tự gọi API vẫn bị chặn dù có bỏ qua màn hình này.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
	const { t } = useLang();
	const { config, failed } = useSiteConfig();

	// Chưa biết trạng thái thì chưa vẽ gì: hiện tạm trang chủ rồi giật sang màn
	// hình bảo trì ngay sau đó còn khó hiểu hơn là chờ thêm một nhịp.
	if (!config && !failed) {
		return (
			<Layout>
				<div className="center">
					<div className="spinner" role="status" aria-label="Đang tải" />
				</div>
			</Layout>
		);
	}

	// Hỏi cấu hình mà hỏng thì để trang tự lo phần báo lỗi mạng của nó, đừng
	// dựng hàng rào bảo trì dựa trên một câu trả lời chưa bao giờ tới.
	if (!config?.maintenance || config.maintenanceBypass) return <>{children}</>;

	return (
		<Layout title={config.siteTitle}>
			<div className="panel">
				<span className="badge warn">{t.maintenanceBadge}</span>
				<h2>{t.maintenanceTitle}</h2>
				<p>{t.maintenanceBody}</p>
				{/* Lời nhắn của chủ trang đứng sau câu chung: câu chung nói chuyện gì
				    đang xảy ra, lời nhắn nói thêm bao giờ xong. */}
				{config.maintenanceNote && (
					<p className="hint">{config.maintenanceNote}</p>
				)}
			</div>
		</Layout>
	);
}
