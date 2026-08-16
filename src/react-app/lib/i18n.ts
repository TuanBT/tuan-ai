export type Lang = "vi" | "en";

const STORAGE_KEY = "tuanai_lang";

/**
 * Mặc định luôn là tiếng Việt — người xem đến từ kênh TikTok/YouTube tiếng
 * Việt, nên tiếng Anh là lựa chọn thêm chứ không phải suy ra từ cài đặt máy.
 */
export function initialLang(): Lang {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved === "vi" || saved === "en") return saved;
	return "vi";
}

export function saveLang(lang: Lang) {
	localStorage.setItem(STORAGE_KEY, lang);
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
	backIn: string;
	lookupTitle: string;
	lookupPlaceholder: string;
	lookupBtn: string;
	notFound: string;
	tooManyLookups: string;
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
		submit: "Gửi ngay",
		sending: "Đang gửi…",
		galleryTitle: "Đã lên sóng",
		successTitle: "Đã nhận bài của bạn!",
		successBody:
			"Giữ mã này để xem bài của bạn có được chọn không. Chụp màn hình lại cho chắc nhé.",
		yourCode: "Mã của bạn",
		viewStatus: "Xem trạng thái bài",
		another: "Gửi bài khác",
		closedQuota: "Hôm nay đã nhận đủ bài",
		closedQuotaBody:
			"Mỗi ngày mình chỉ nhận một lượng vừa đủ để kịp duyệt tay. Bạn quay lại sau nhé — ảnh chưa gửi vẫn còn trong máy bạn.",
		closedPaused: "Tạm ngưng nhận bài",
		closedPausedBody: "Mình đang dồn sức làm nốt các bài đã nhận. Quay lại sau nhé!",
		backIn: "Mở lại sau",
		lookupTitle: "Tra cứu bài của bạn",
		lookupPlaceholder: "Nhập mã, ví dụ TA-04829173",
		lookupBtn: "Tra cứu",
		notFound: "Không tìm thấy mã này. Bạn kiểm tra lại nhé.",
		tooManyLookups:
			"Bạn đã tra sai quá nhiều lần hôm nay. Mai thử lại giúp mình nhé.",
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
		submit: "Send it",
		sending: "Sending…",
		galleryTitle: "Recently on air",
		successTitle: "Got your idea!",
		successBody:
			"Keep this code to check whether your idea gets picked. A screenshot is a good idea.",
		yourCode: "Your code",
		viewStatus: "Check status",
		another: "Send another",
		closedQuota: "Today's inbox is full",
		closedQuotaBody:
			"I only take as many as I can review by hand each day. Come back later — your photos are still on your phone.",
		closedPaused: "Submissions paused",
		closedPausedBody: "I'm catching up on what's already in. Check back soon!",
		backIn: "Opens again in",
		lookupTitle: "Check your submission",
		lookupPlaceholder: "Enter your code, e.g. TA-04829173",
		lookupBtn: "Look up",
		notFound: "No submission with that code. Please check it again.",
		tooManyLookups:
			"Too many failed lookups today. Please try again tomorrow.",
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
