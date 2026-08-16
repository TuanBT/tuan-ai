import { Outlet, Route, Routes } from "react-router-dom";
import { MaintenanceGate } from "./components/Maintenance";
import { Admin } from "./pages/Admin";
import { Lookup } from "./pages/Lookup";
import { NotFound } from "./pages/NotFound";
import { Privacy } from "./pages/Privacy";
import { Submit } from "./pages/Submit";
import { Terms } from "./pages/Terms";

export default function App() {
	return (
		<Routes>
			{/* Gửi bài và tra cứu đóng khi bảo trì; điều khoản, quyền riêng tư và khu
			    quản trị thì không — xem lý do trong MaintenanceGate. */}
			<Route
				element={
					<MaintenanceGate>
						<Outlet />
					</MaintenanceGate>
				}
			>
				<Route path="/" element={<Submit />} />
				<Route path="/r" element={<Lookup />} />
				<Route path="/r/:code" element={<Lookup />} />
				{/* Đường lạ cũng nằm sau hàng rào: lúc đang bảo trì thì "cả trang
				    đang đóng" là câu trả lời đúng hơn "không có trang này". */}
				<Route path="*" element={<NotFound />} />
			</Route>
			<Route path="/privacy" element={<Privacy />} />
			<Route path="/terms" element={<Terms />} />
			<Route path="/admin" element={<Admin />} />
		</Routes>
	);
}
