import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { LangProvider } from "./lib/lang.tsx";
import "./styles.css";

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
