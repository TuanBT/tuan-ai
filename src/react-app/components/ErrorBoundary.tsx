import { Component, type ErrorInfo, type ReactNode } from "react";
import { copy, initialLang } from "../lib/i18n";

/**
 * Lưới an toàn cuối cùng: không có nó thì bất kỳ lỗi render nào cũng thành một
 * trang trắng tinh, không chữ nào, không cả nút tải lại.
 *
 * Nằm ngoài `LangProvider` để bắt được cả lỗi của chính provider đó, nên phần
 * chữ ở đây đọc thẳng ngôn ngữ đã lưu thay vì qua context.
 */
export class ErrorBoundary extends Component<
	{ children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		// Cloudflare Workers có bật observability, nhưng lỗi phía trình duyệt thì
		// chỉ tới được console — ít nhất cũng đủ để dò khi có người báo lỗi.
		console.error("Lỗi render:", error, info.componentStack);
	}

	render() {
		if (!this.state.failed) return this.props.children;

		const t = copy[initialLang()];
		return (
			<div className="page">
				<div className="panel">
					<span className="badge bad">!</span>
					<h2>{t.crashTitle}</h2>
					<p>{t.crashBody}</p>
					<button
						type="button"
						className="cta"
						onClick={() => window.location.reload()}
					>
						{t.crashRetry}
					</button>
				</div>
			</div>
		);
	}
}
