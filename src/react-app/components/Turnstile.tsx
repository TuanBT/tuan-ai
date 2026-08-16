import { useEffect, useRef } from "react";

declare global {
	interface Window {
		turnstile?: {
			render: (
				el: HTMLElement,
				options: {
					sitekey: string;
					callback: (token: string) => void;
					"expired-callback"?: () => void;
					"error-callback"?: () => void;
					size?: "normal" | "flexible" | "compact";
					theme?: "light" | "dark" | "auto";
				},
			) => string;
			remove: (id: string) => void;
		};
	}
}

const SCRIPT_SRC =
	"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
	if (window.turnstile) return Promise.resolve();
	if (!scriptPromise) {
		scriptPromise = new Promise<void>((resolve, reject) => {
			const script = document.createElement("script");
			script.src = SCRIPT_SRC;
			script.async = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error("turnstile_script"));
			document.head.appendChild(script);
		});
	}
	return scriptPromise;
}

/**
 * Chạy ngầm, người dùng thường không phải bấm gì. Khi chưa cấu hình site key
 * (lúc phát triển) thì không hiện gì cả và bỏ qua bước xác minh.
 */
export function Turnstile({
	siteKey,
	onToken,
}: {
	siteKey: string | null;
	onToken: (token: string | null) => void;
}) {
	const holder = useRef<HTMLDivElement>(null);
	const callback = useRef(onToken);

	// Giữ hàm gọi lại luôn mới mà không phải dựng lại widget mỗi lần render.
	useEffect(() => {
		callback.current = onToken;
	}, [onToken]);

	useEffect(() => {
		if (!siteKey || !holder.current) return;

		let widgetId: string | undefined;
		let cancelled = false;
		const el = holder.current;

		loadScript()
			.then(() => {
				if (cancelled || !window.turnstile) return;
				widgetId = window.turnstile.render(el, {
					sitekey: siteKey,
					size: "flexible",
					// Theo cài đặt sáng/tối của máy, giống phần còn lại của trang.
					// Khoá cứng "light" sẽ thành một ô trắng loá giữa nền tối.
					theme: "auto",
					callback: (token) => callback.current(token),
					"expired-callback": () => callback.current(null),
					"error-callback": () => callback.current(null),
				});
			})
			.catch(() => callback.current(null));

		return () => {
			cancelled = true;
			if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
		};
	}, [siteKey]);

	if (!siteKey) return null;
	return <div ref={holder} />;
}
