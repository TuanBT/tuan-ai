import { useEffect, useState } from "react";
import { readLocal, writeLocal } from "./local";

export type Theme = "light" | "dark";

const STORAGE_KEY = "tuanai_theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function media(): MediaQueryList | null {
	// matchMedia thiếu ở vài môi trường nhúng và trong test chạy trên node.
	return typeof window !== "undefined" && window.matchMedia
		? window.matchMedia(DARK_QUERY)
		: null;
}

export function systemTheme(): Theme {
	return media()?.matches ? "dark" : "light";
}

/** Lựa chọn người dùng đã lưu, hoặc `null` nghĩa là "theo máy". */
export function savedTheme(): Theme | null {
	const value = readLocal(STORAGE_KEY);
	return value === "light" || value === "dark" ? value : null;
}

/**
 * Ghi lựa chọn lên thẻ `<html>`.
 *
 * Trang **luôn** mang thuộc tính `data-theme`, kể cả khi người dùng chưa chọn gì
 * — lúc đó giá trị lấy theo máy. Nhờ vậy bảng màu tối trong CSS chỉ cần viết một
 * lần cho `[data-theme="dark"]`, thay vì viết hai lần: một cho `@media
 * (prefers-color-scheme: dark)` và một cho lựa chọn tay. Hai bản chép tay như
 * thế chắc chắn sẽ lệch nhau ở lần sửa màu tiếp theo.
 *
 * Trang là ứng dụng React, không có JavaScript thì không có gì để xem, nên việc
 * phụ thuộc vào JS ở đây không lấy mất chế độ tối của ai cả.
 */
export function applyTheme(theme: Theme): void {
	document.documentElement.dataset.theme = theme;

	// Thanh trình duyệt trên điện thoại đọc thẻ này. Không đổi theo thì bấm sang
	// nền tối xong vẫn còn một vạch trắng nằm ngay trên đầu trang.
	const meta = document.querySelector('meta[name="theme-color"]');
	meta?.setAttribute("content", theme === "dark" ? "#15141a" : "#ffffff");
}

/** Gọi một lần lúc khởi động, trước khi React vẽ, để tránh nháy sáng. */
export function bootTheme(): void {
	applyTheme(savedTheme() ?? systemTheme());
}

export function useTheme() {
	const [choice, setChoice] = useState<Theme | null>(savedTheme);
	const [system, setSystem] = useState<Theme>(systemTheme);

	// Người dùng đổi cài đặt máy giữa chừng thì trang đổi theo — nhưng chỉ khi
	// họ chưa tự chọn, vì lựa chọn tay phải là tiếng nói cuối cùng.
	useEffect(() => {
		const query = media();
		if (!query) return;
		const onChange = (event: MediaQueryListEvent) =>
			setSystem(event.matches ? "dark" : "light");
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);

	const theme = choice ?? system;

	useEffect(() => applyTheme(theme), [theme]);

	return {
		theme,
		toggle() {
			const next: Theme = theme === "dark" ? "light" : "dark";
			writeLocal(STORAGE_KEY, next);
			setChoice(next);
		},
	};
}
