import { Navigate, Route, Routes } from "react-router-dom";
import { Admin } from "./pages/Admin";
import { Lookup } from "./pages/Lookup";
import { Privacy } from "./pages/Privacy";
import { Submit } from "./pages/Submit";
import { Terms } from "./pages/Terms";

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Submit />} />
			<Route path="/r" element={<Lookup />} />
			<Route path="/r/:code" element={<Lookup />} />
			<Route path="/privacy" element={<Privacy />} />
			<Route path="/terms" element={<Terms />} />
			<Route path="/admin" element={<Admin />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
