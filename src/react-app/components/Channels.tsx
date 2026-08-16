import type { Channels as ChannelLinks } from "../lib/api";
import { useLang } from "../lib/lang-context";

/**
 * Nút dẫn sang kênh TikTok / YouTube.
 *
 * Đường dẫn do người quản trị nhập trong /admin; chưa nhập thì không hiện gì
 * cả, vì một nút dẫn đi đâu không rõ còn tệ hơn là không có nút.
 */
export function ChannelLinksRow({
	channels,
}: {
	channels: ChannelLinks | undefined;
}) {
	const { lang } = useLang();
	if (!channels?.tiktok && !channels?.youtube) return null;

	const label = lang === "vi" ? "Xem kênh trên" : "Watch on";

	return (
		<div className="channels" aria-label={label}>
			{channels.tiktok && (
				<a href={channels.tiktok} target="_blank" rel="noopener noreferrer">
					<TikTokMark />
					TikTok
				</a>
			)}
			{channels.youtube && (
				<a href={channels.youtube} target="_blank" rel="noopener noreferrer">
					<YouTubeMark />
					YouTube
				</a>
			)}
		</div>
	);
}

/* Hai dấu hiệu nhận biết kênh, dùng lại ở trang tra cứu cho nút xem tác phẩm:
   người ta nhận ra biểu tượng nhanh hơn đọc chữ. */
export function TikTokMark() {
	return (
		<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
			<path
				fill="currentColor"
				d="M16.6 5.82A4.28 4.28 0 0 1 15.55 3h-3.1v12.4a2.6 2.6 0 1 1-1.86-2.5V9.7a5.7 5.7 0 1 0 4.96 5.65V9.01a7.3 7.3 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.25-1.48Z"
			/>
		</svg>
	);
}

export function YouTubeMark() {
	return (
		<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
			<path
				fill="currentColor"
				d="M23 12s0-3.5-.45-5.17a2.6 2.6 0 0 0-1.83-1.84C19.05 4.5 12 4.5 12 4.5s-7.05 0-8.72.49a2.6 2.6 0 0 0-1.83 1.84C1 8.5 1 12 1 12s0 3.5.45 5.17a2.6 2.6 0 0 0 1.83 1.84c1.67.49 8.72.49 8.72.49s7.05 0 8.72-.49a2.6 2.6 0 0 0 1.83-1.84C23 15.5 23 12 23 12Z"
			/>
			<path fill="var(--bg)" d="m9.75 15.5 6-3.5-6-3.5v7Z" />
		</svg>
	);
}
