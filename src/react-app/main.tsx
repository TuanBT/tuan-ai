import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { LangProvider } from "./lib/lang.tsx";
import { bootTheme } from "./lib/theme.ts";
import "./styles.css";

// Đặt bảng màu trước khi React vẽ lần đầu, để người đã chọn nền tối không phải
// chớp qua một khung trắng.
bootTheme();

// Đăng ký service worker cho PWA. Chỉ chạy khi trình duyệt hỗ trợ, và bỏ qua
// trong chế độ dev vì Vite HMR tự lo module nóng.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
	navigator.serviceWorker.register("/sw.js").catch(() => {
		// Không cần báo lỗi, PWA là nâng cấp chứ không phải yêu cầu bắt buộc.
	});
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ErrorBoundary>
			<BrowserRouter>
				<LangProvider>
					<App />
				</LangProvider>
			</BrowserRouter>
		</ErrorBoundary>
	</StrictMode>,
);
