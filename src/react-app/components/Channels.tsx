import type { Channels as ChannelLinks } from "../lib/api";
import { useLang } from "../lib/lang-context";
import { TikTokMark, YouTubeMark } from "./icons";

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
