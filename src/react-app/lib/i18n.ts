import { readLocal, writeLocal } from "./local";

export type Lang = "vi" | "en";

const STORAGE_KEY = "tuanai_lang";

/**
 * Mặc định luôn là tiếng Việt — người xem đến từ kênh TikTok/YouTube tiếng
 * Việt, nên tiếng Anh là lựa chọn thêm chứ không phải suy ra từ cài đặt máy.
 */
export function initialLang(): Lang {
	const saved = readLocal(STORAGE_KEY);
	if (saved === "vi" || saved === "en") return saved;
	return "vi";
}

export function saveLang(lang: Lang) {
	writeLocal(STORAGE_KEY, lang);
}

interface Dictionary {
	submitEyebrow: string;
	pickImages: string;
	pickHint: (max: number) => string;
	compressing: string;
	advisory: string;
	styleLabel: string;
	descLabel: string;
	descPlaceholder: string;
	nickname: string;
	email: string;
	emailHint: string;
	consent: string;
	retentionNote: (days: number) => string;
	submit: string;
	sending: string;
	galleryTitle: string;
	successTitle: string;
	successBody: string;
	yourCode: string;
	viewStatus: string;
	another: string;
	closedQuota: string;
	closedQuotaBody: string;
	closedPaused: string;
	closedPausedBody: string;
	closedSetup: string;
	closedSetupBody: string;
	backIn: string;
	lookupTitle: string;
	lookupPlaceholder: string;
	lookupBtn: string;
	notFound: string;
	tooManyLookups: string;
	mineTitle: string;
	mineHint: string;
	mineForgetAll: string;
	mineForgetOne: string;
	mineConfirm: string;
	crashTitle: string;
	crashBody: string;
	crashRetry: string;
	statusNew: string;
	statusSelected: string;
	statusDone: string;
	statusRejected: string;
	statusNewBody: string;
	statusSelectedBody: string;
	statusDoneBody: string;
	statusRejectedBody: string;
	watchNow: string;
	imagesGone: string;
	errors: Record<string, string>;
}

export const copy: Record<Lang, Dictionary> = {
	vi: {
		submitEyebrow: "Gửi ý tưởng",
		pickImages: "Chạm để chọn ảnh",
		pickHint: (max: number) => `1–${max} tấm · JPG, PNG`,
		compressing: "Đang xử lý ảnh…",
		advisory:
			"Nên gửi ảnh bạn tự chụp hoặc ảnh gia đình mình. Cân nhắc kỹ với ảnh có mặt người khác. Không gửi ảnh nhạy cảm liên quan tới trẻ em.",
		styleLabel: "Bạn muốn kiểu nào?",
		descLabel: "Kể mình nghe bạn muốn gì nhé",
		descPlaceholder: "Ví dụ: cho khói bếp bay nhẹ, thêm nắng chiều vàng…",
		nickname: "Tên hiển thị khi lên sóng",
		email: "Email — không bắt buộc",
		emailHint: "Chỉ dùng để báo khi bài của bạn được chọn.",
		consent: "Mình đồng ý cho ảnh và tác phẩm xuất hiện trên kênh.",
		retentionNote: (days: number) =>
			`Ảnh gốc của bạn tự xoá sau ${days} ngày. Phần mô tả cũng không giữ mãi.`,
		submit: "Gửi ngay",
		sending: "Đang gửi…",
		galleryTitle: "Đã lên sóng",
		successTitle: "Đã nhận bài của bạn!",
		successBody:
			"Giữ mã này để xem bài của bạn có được chọn không. Mình đã nhớ sẵn mã trên máy này để bạn tra lại cho nhanh, nhưng chụp màn hình lại thì chắc chắn hơn.",
		yourCode: "Mã của bạn",
		viewStatus: "Xem trạng thái bài",
		another: "Gửi bài khác",
		closedQuota: "Hôm nay đã nhận đủ bài",
		closedQuotaBody:
			"Mỗi ngày mình chỉ nhận một lượng vừa đủ để kịp duyệt tay. Bạn quay lại sau nhé — ảnh chưa gửi vẫn còn trong máy bạn.",
		closedPaused: "Tạm ngưng nhận bài",
		closedPausedBody: "Mình đang dồn sức làm nốt các bài đã nhận. Quay lại sau nhé!",
		closedSetup: "Trang đang được thiết lập",
		closedSetupBody:
			"Phần chống bot chưa cấu hình xong nên mình tạm chưa nhận bài, để hộp thư không bị máy tự động gửi rác. Bạn quay lại sau một chút nhé.",
		backIn: "Mở lại sau",
		lookupTitle: "Tra cứu bài của bạn",
		lookupPlaceholder: "04829173",
		lookupBtn: "Tra cứu",
		notFound: "Không tìm thấy mã này. Bạn kiểm tra lại nhé.",
		tooManyLookups:
			"Bạn đã tra sai quá nhiều lần hôm nay. Mai thử lại giúp mình nhé.",
		mineTitle: "Bài của bạn",
		mineHint:
			"Danh sách này chỉ nằm trong trình duyệt trên máy này, không gửi đi đâu cả. Đổi máy, dùng chế độ ẩn danh hay xoá dữ liệu duyệt web là mất — nên bạn vẫn cứ giữ mã ở chỗ khác cho chắc.",
		mineForgetAll: "Xoá khỏi máy này",
		mineForgetOne: "Bỏ khỏi danh sách",
		mineConfirm:
			"Xoá danh sách đã lưu trên máy này? Bài gửi của bạn vẫn còn nguyên, chỉ mất đường tắt để mở lại thôi.",
		crashTitle: "Trang gặp trục trặc",
		crashBody:
			"Có lỗi ngoài dự tính. Bạn thử tải lại trang giúp mình nhé — bài đã gửi thì vẫn còn nguyên.",
		crashRetry: "Tải lại trang",
		statusNew: "Đang chờ duyệt",
		statusSelected: "Đã được chọn!",
		statusDone: "Đã lên sóng",
		statusRejected: "Chưa phù hợp lần này",
		statusNewBody: "Mình sẽ xem và chọn trong vài ngày tới.",
		statusSelectedBody: "Bài của bạn đã được chọn, mình đang dựng clip.",
		statusDoneBody: "Tác phẩm của bạn đã lên kênh rồi!",
		statusRejectedBody:
			"Lần này mình chưa dùng được bài của bạn, nhưng đừng ngại gửi bài khác nhé.",
		watchNow: "Xem tác phẩm",
		imagesGone: "Ảnh gốc đã được xoá tự động để bảo vệ riêng tư của bạn.",
		errors: {
			quota: "Hôm nay đã nhận đủ bài, bạn quay lại sau nhé.",
			ip_limit: "Bạn đã gửi khá nhiều bài hôm nay rồi. Mai gửi tiếp nhé!",
			turnstile: "Chưa xác minh được bạn là người thật. Thử lại giúp mình.",
			turnstile_unconfigured:
				"Trang đang được thiết lập nên tạm chưa nhận bài. Bạn quay lại sau nhé.",
			paused: "Mình đang tạm ngưng nhận bài. Quay lại sau nhé!",
			image_size: "Có tấm ảnh quá nặng. Bạn chọn ảnh khác nhé.",
			image_type: "Chỉ nhận ảnh JPG, PNG hoặc WebP.",
			image_count: "Bạn cần chọn ít nhất một tấm ảnh.",
			missing_fields: "Bạn điền giúp mình tên và phần mô tả nhé.",
			bad_email: "Địa chỉ email chưa đúng định dạng.",
			network: "Mạng đang trục trặc. Bạn thử gửi lại nhé.",
			generic: "Có gì đó chưa ổn. Bạn thử lại giúp mình nhé.",
		},
	},
	en: {
		submitEyebrow: "Send an idea",
		pickImages: "Tap to choose photos",
		pickHint: (max: number) => `1–${max} images · JPG, PNG`,
		compressing: "Processing images…",
		advisory:
			"Please send photos you took yourself or photos of your own family. Think twice about photos showing other people. Never send sensitive images involving children.",
		styleLabel: "What would you like?",
		descLabel: "Tell me what you have in mind",
		descPlaceholder: "For example: let the smoke drift, add warm evening light…",
		nickname: "Name to show on air",
		email: "Email — optional",
		emailHint: "Only used to tell you when your idea gets picked.",
		consent: "I agree to my photo and the result appearing on the channel.",
		retentionNote: (days: number) =>
			`Your original photos are deleted automatically after ${days} days. The description isn't kept forever either.`,
		submit: "Send it",
		sending: "Sending…",
		galleryTitle: "Recently on air",
		successTitle: "Got your idea!",
		successBody:
			"Keep this code to check whether your idea gets picked. It's remembered on this device so you can find it again, but a screenshot is safer.",
		yourCode: "Your code",
		viewStatus: "Check status",
		another: "Send another",
		closedQuota: "Today's inbox is full",
		closedQuotaBody:
			"I only take as many as I can review by hand each day. Come back later — your photos are still on your phone.",
		closedPaused: "Submissions paused",
		closedPausedBody: "I'm catching up on what's already in. Check back soon!",
		closedSetup: "Setting things up",
		closedSetupBody:
			"Bot protection isn't configured yet, so submissions are on hold to keep the inbox free of automated junk. Please check back shortly.",
		backIn: "Opens again in",
		lookupTitle: "Check your submission",
		lookupPlaceholder: "04829173",
		lookupBtn: "Look up",
		notFound: "No submission with that code. Please check it again.",
		tooManyLookups:
			"Too many failed lookups today. Please try again tomorrow.",
		mineTitle: "Your submissions",
		mineHint:
			"This list lives only in this browser, on this device — it is never sent anywhere. Switch devices, browse privately or clear your browsing data and it's gone, so keep your code somewhere else too.",
		mineForgetAll: "Forget on this device",
		mineForgetOne: "Remove from list",
		mineConfirm:
			"Clear the list saved on this device? Your submissions stay exactly as they are — you'd only lose the shortcut back to them.",
		crashTitle: "Something broke",
		crashBody:
			"An unexpected error came up. Please reload the page — anything you already sent is safe.",
		crashRetry: "Reload the page",
		statusNew: "Waiting for review",
		statusSelected: "Picked!",
		statusDone: "On air",
		statusRejected: "Not this time",
		statusNewBody: "I'll go through submissions over the next few days.",
		statusSelectedBody: "Yours got picked — I'm making the clip now.",
		statusDoneBody: "Your piece is live on the channel!",
		statusRejectedBody:
			"I couldn't use this one, but please do send another idea.",
		watchNow: "Watch it",
		imagesGone: "The original photos were deleted automatically for your privacy.",
		errors: {
			quota: "Today's inbox is full. Please come back later.",
			ip_limit: "You've sent quite a few today. Try again tomorrow!",
			turnstile: "Couldn't verify you're human. Please try again.",
			turnstile_unconfigured:
				"The site is still being set up, so submissions are on hold. Please check back later.",
			paused: "Submissions are paused right now. Please check back later!",
			image_size: "One of the images is too large. Please pick another.",
			image_type: "Only JPG, PNG or WebP images are accepted.",
			image_count: "Please choose at least one image.",
			missing_fields: "Please fill in your name and the description.",
			bad_email: "That email address doesn't look right.",
			network: "Network trouble. Please try sending again.",
			generic: "Something went wrong. Please try again.",
		},
	},
};

export type Copy = Dictionary;
