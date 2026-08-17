import { readLocal, writeLocal } from "./local";

export type Lang = "vi" | "en";

const STORAGE_KEY = "tuanai_lang";

/**
 * Mặc định luôn là tiếng Việt, vì người xem đến từ kênh TikTok/YouTube tiếng
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
	navSubmit: string;
	navMine: string;
	navAdmin: string;
	/* Nhãn ngắn cho chân trang. Tên đầy đủ của hai trang pháp lý dài gần gấp đôi,
	   đứng cạnh nhau trong một hàng chữ nhỏ thì thành một khối chữ đặc. */
	navTerms: string;
	navPrivacy: string;
	footerChannels: string;
	backHome: string;
	copyCode: string;
	copied: string;
	submitEyebrow: string;
	appDescription: string;
	/* Ba bước của chính biểu mẫu. Trước đây trang mở đầu bằng một khối "ba bước"
	   kể chuyện quy trình, tách rời khỏi việc phải làm; giờ số bước gắn thẳng vào
	   từng phần của biểu mẫu, nên không còn phải nói trước rồi làm lại từ đầu. */
	stepPhotos: string;
	stepIdea: string;
	stepIdeaHint: string;
	/* Kiểu là thứ nói thêm, không phải nhánh thứ hai của một câu hỏi "chọn cái
	   nào". Nhãn nói thẳng ra là tuỳ ý, để hàng chip bên dưới khỏi trông như một
	   việc còn dở. */
	stylesLabel: string;
	/* Lời dẫn cho lối thoát cuối bước: người không tả nổi thì hỏi thẳng họ câu
	   đó, rồi đưa nút. Tên nút lấy từ chính cái kiểu trong /admin, không viết
	   cứng ở đây. */
	delegateLead: string;
	stepYou: string;
	pickImages: string;
	pickHint: (max: number) => string;
	compressing: string;
	/* Luật nhận ảnh nằm gọn trong phần "Ảnh thế nào thì hợp?" chứ không đứng
	   riêng một dòng: cùng một chuyện "ảnh nào được, ảnh nào không", tách làm hai
	   chỗ thì bước chọn ảnh có tới ba dòng chữ chen nhau. */
	advisoryTitle: string;
	advisoryRule: string;
	advisoryMore: string;
	descPlaceholder: string;
	ideasTitle: string;
	ideas: string[];
	nickname: string;
	email: string;
	consent: string;
	/* Câu này sống ở trang tra cứu, không phải trang gửi bài: chỗ đó nó chỉ là
	   thêm một dòng phải đọc trước khi được bấm gửi, còn ở đây nó trả lời đúng
	   câu người vừa tra mã sắp hỏi. */
	retentionNote: (days: number) => string;
	submit: string;
	sending: string;
	galleryTitle: string;
	galleryHint: string;
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
	/* Bảo trì đóng cả trang, nên nó có màn hình riêng chứ không chỉ là một lý do
	   đóng form. `maintenanceAdmin` là dải nhắc chỉ chủ trang mới thấy. */
	maintenanceBadge: string;
	maintenanceTitle: string;
	maintenanceBody: string;
	maintenanceAdmin: string;
	notFoundBadge: string;
	notFoundTitle: string;
	notFoundBody: string;
	backIn: string;
	lookupTitle: string;
	lookupLead: string;
	lookupPlaceholder: string;
	lookupBtn: string;
	notFound: string;
	tooManyLookups: string;
	mineTitle: string;
	mineHint: string;
	mineEmpty: string;
	mineForgetAll: string;
	mineForgetOne: string;
	mineConfirm: string;
	stepReceived: string;
	stepPicked: string;
	stepLive: string;
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
	/** Nhãn của lý do chủ trang viết riêng cho bài bị bỏ qua. */
	rejectReasonLabel: string;
	watchNow: string;
	imagesGone: string;
	viewerTitle: string;
	viewerOpen: string;
	viewerClose: string;
	viewerPrev: string;
	viewerNext: string;
	privacyTitle: string;
	privacyUpdated: string;
	termsTitle: string;
	termsUpdated: string;
	errors: Record<string, string>;
}

export const copy: Record<Lang, Dictionary> = {
	vi: {
		navSubmit: "Gửi ý tưởng",
		navMine: "Bài của tôi",
		navAdmin: "Quản trị",
		navTerms: "Điều khoản",
		navPrivacy: "Quyền riêng tư",
		footerChannels: "Xem kênh trên",
		backHome: "Trang chủ",
		copyCode: "Chép mã",
		copied: "Đã chép!",
		submitEyebrow: "Gửi ý tưởng",
		appDescription:
			"Gửi ảnh kèm ý tưởng, nhận clip AI vui vẻ đăng trên kênh TikTok và YouTube.",
		stepPhotos: "Chọn ảnh",
		stepIdea: "Muốn clip thế nào?",
		stepIdeaHint: "Gõ vài chữ về điều bạn muốn thấy.",
		stylesLabel: "Thêm kiểu (tuỳ ý)",
		delegateLead: "Không biết tả sao?",
		stepYou: "Bạn là ai?",
		pickImages: "Chạm để chọn ảnh",
		/* Chỉ nói số lượng. Kể tên định dạng thì người dùng iPhone thấy "JPG, PNG"
		   lại tưởng ảnh HEIC của mình không gửi được, mà trang thì tự đổi mọi tấm
		   sang JPG trước khi gửi (xem `lib/compress.ts`). */
		pickHint: (max: number) => `1–${max} tấm`,
		compressing: "Đang xử lý ảnh…",
		advisoryTitle: "Ảnh thế nào thì hợp?",
		advisoryRule: "Đừng gửi ảnh nhạy cảm hay ảnh trẻ em.",
		advisoryMore:
			"Hợp nhất là tranh vẽ, đồ vật, món ăn, đồ chơi, càng vô tri càng dễ thành clip vui. Nếu ảnh có mặt người, hãy chắc chắn đó là ảnh bạn được phép dùng.",
		descPlaceholder: "Ví dụ: cho ấm trà tự rót nước rồi cúi chào khán giả…",
		ideasTitle: "Gợi ý",
		ideas: [
			"Ly cà phê trên bàn tự nhảy cha-cha, khói bốc lên theo nhịp nhạc.",
			"Bức tranh phong cảnh: gió thổi qua đồng lúa, con thuyền trôi dần ra khỏi khung.",
			"Đôi dép dưới sàn tự đi lại quanh nhà như đang đi tìm chủ.",
			"Chú gấu bông trên kệ chớp mắt, ngáp một cái rồi vẫy tay chào.",
			"Nồi nước đang sôi, mấy cọng hành nhảy múa như ca sĩ trên sân khấu.",
			"Chiếc xe máy dựng ở sân rùng mình tỉnh giấc rồi rồ ga phóng đi.",
			"Làm bức tượng này sống động, thở hít rồi cử động như thật.",
			"Biến bức vẽ này thành thật, nhân vật bước ra khỏi trang giấy.",
			"Từ nét vẽ nguệch ngoạc biến dần thành đồ thật, chi tiết hiện lên từng chút.",
		],
		nickname: "Tên hiển thị khi lên sóng",
		email: "Email (không bắt buộc)",
		consent: "Mình đồng ý cho ảnh và tác phẩm xuất hiện trên kênh.",
		retentionNote: (days: number) =>
			`Ảnh gốc tự xoá sau ${days} ngày kể từ lúc gửi. Phần nội dung thì giữ lại, cứ giữ mã là sau này vẫn tra được.`,
		submit: "Gửi ngay",
		sending: "Đang gửi…",
		galleryTitle: "Đã lên sóng",
		galleryHint: "Chạm vào một ô để xem clip trên kênh.",
		successTitle: "Đã nhận bài của bạn!",
		successBody:
			"Giữ mã này để xem bài của bạn có được chọn không. Mình đã nhớ sẵn mã trên máy này để bạn tra lại cho nhanh, nhưng chụp màn hình lại thì chắc chắn hơn.",
		yourCode: "Mã của bạn",
		viewStatus: "Xem trạng thái bài",
		another: "Gửi bài khác",
		closedQuota: "Hôm nay đã nhận đủ bài",
		closedQuotaBody:
			"Mỗi ngày mình chỉ nhận một lượng vừa đủ để kịp duyệt tay. Bạn quay lại sau nhé, ảnh chưa gửi vẫn còn trong máy bạn.",
		closedPaused: "Tạm ngưng nhận bài",
		closedPausedBody: "Mình đang dồn sức làm nốt các bài đã nhận. Quay lại sau nhé!",
		closedSetup: "Trang đang được thiết lập",
		closedSetupBody:
			"Phần chống bot chưa cấu hình xong nên mình tạm chưa nhận bài, để hộp thư không bị máy tự động gửi rác. Bạn quay lại sau một chút nhé.",
		maintenanceBadge: "Đang bảo trì",
		maintenanceTitle: "Trang đang bảo trì",
		maintenanceBody:
			"Mình đang sửa vài thứ bên trong nên tạm đóng cả trang một lát. Bài đã gửi và mã của bạn vẫn còn nguyên, quay lại sau nhé.",
		maintenanceAdmin:
			"Trang đang bảo trì. Bạn xem được vì đang đăng nhập quản trị, người khác chỉ thấy thông báo bảo trì.",
		notFoundBadge: "404",
		notFoundTitle: "Không có trang này",
		notFoundBody:
			"Đường dẫn bạn vừa mở không dẫn tới đâu cả. Có thể link bị gõ thiếu, hoặc chép còn một nửa. Nếu bạn đang tìm bài đã gửi, sang phần tra cứu rồi nhập mã tám chữ số nhé.",
		backIn: "Mở lại sau",
		lookupTitle: "Bài của bạn tới đâu rồi?",
		lookupLead:
			"Nhập mã tám chữ số mình đưa lúc bạn gửi bài. Máy này cũng nhớ sẵn những bài đã gửi cho bạn.",
		lookupPlaceholder: "04829173",
		lookupBtn: "Tra cứu",
		notFound: "Không tìm thấy mã này. Bạn kiểm tra lại nhé.",
		tooManyLookups:
			"Bạn đã tra sai quá nhiều lần hôm nay. Mai thử lại giúp mình nhé.",
		mineTitle: "Bài của bạn",
		mineHint:
			"Danh sách này chỉ nằm trong trình duyệt trên máy này, không gửi đi đâu cả. Đổi máy, dùng chế độ ẩn danh hay xoá dữ liệu duyệt web là mất, nên bạn vẫn cứ giữ mã ở chỗ khác cho chắc.",
		mineEmpty:
			"Máy này chưa lưu bài nào. Gửi bài đầu tiên đi, mình sẽ nhớ mã hộ bạn ngay tại đây.",
		mineForgetAll: "Xoá khỏi máy này",
		mineForgetOne: "Bỏ khỏi danh sách",
		mineConfirm:
			"Xoá danh sách mã, cùng tên và email đã nhớ trên máy này? Bài gửi của bạn vẫn còn nguyên, chỉ mất đường tắt để mở lại thôi.",
		stepReceived: "Đã nhận",
		stepPicked: "Đã chọn",
		stepLive: "Lên sóng",
		crashTitle: "Trang gặp trục trặc",
		crashBody:
			"Có lỗi ngoài dự tính. Bạn thử tải lại trang giúp mình nhé, bài đã gửi thì vẫn còn nguyên.",
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
		rejectReasonLabel: "Lý do",
		watchNow: "Xem tác phẩm",
		imagesGone:
			"Ảnh gốc đã hết hạn và được xoá tự động. Phần nội dung dưới đây thì vẫn còn.",
		viewerTitle: "Xem ảnh",
		viewerOpen: "Xem ảnh lớn",
		viewerClose: "Đóng",
		viewerPrev: "Ảnh trước",
		viewerNext: "Ảnh sau",
		privacyTitle: "Chính sách quyền riêng tư",
		privacyUpdated: "Cập nhật lần cuối: 16 tháng 8, 2026",
		termsTitle: "Điều khoản sử dụng",
		termsUpdated: "Cập nhật lần cuối: 16 tháng 8, 2026",
		errors: {
			quota: "Hôm nay đã nhận đủ bài, bạn quay lại sau nhé.",
			ip_limit: "Bạn đã gửi khá nhiều bài hôm nay rồi. Mai gửi tiếp nhé!",
			turnstile: "Chưa xác minh được bạn là người thật. Thử lại giúp mình.",
			turnstile_unconfigured:
				"Trang đang được thiết lập nên tạm chưa nhận bài. Bạn quay lại sau nhé.",
			paused: "Mình đang tạm ngưng nhận bài. Quay lại sau nhé!",
			image_size: "Có tấm ảnh quá nặng. Bạn chọn ảnh khác nhé.",
			image_read:
				"Có tấm ảnh mình không mở được. Bạn chọn tấm khác giúp mình nhé.",
			image_type: "Chỉ nhận ảnh JPG, PNG hoặc WebP.",
			image_count: "Bạn cần chọn ít nhất một tấm ảnh.",
			missing_fields: "Bạn điền giúp mình tên và phần mô tả nhé.",
			bad_email: "Địa chỉ email chưa đúng định dạng.",
			network: "Mạng đang trục trặc. Bạn thử gửi lại nhé.",
			generic: "Có gì đó chưa ổn. Bạn thử lại giúp mình nhé.",
		},
	},
	en: {
		navSubmit: "Send an idea",
		navMine: "My submissions",
		navAdmin: "Admin",
		navTerms: "Terms",
		navPrivacy: "Privacy",
		footerChannels: "Watch on",
		backHome: "Home",
		copyCode: "Copy code",
		copied: "Copied!",
		submitEyebrow: "Send an idea",
		appDescription:
			"Send photos with ideas, get fun AI clips published on our TikTok and YouTube channels.",
		stepPhotos: "Pick photos",
		stepIdea: "What should it do?",
		stepIdeaHint: "Type a few words about what you'd like to see.",
		stylesLabel: "Add a style (optional)",
		delegateLead: "Not sure how to describe it?",
		stepYou: "Who's sending?",
		pickImages: "Tap to choose photos",
		pickHint: (max: number) => `1–${max} photos`,
		compressing: "Processing images…",
		advisoryTitle: "Which photos work best?",
		advisoryRule: "Never send sensitive images or images of children.",
		advisoryMore:
			"Paintings, objects, food and toys work best. The more lifeless, the funnier the clip. If a photo shows a person, make sure it's yours to share.",
		descPlaceholder:
			"For example: the teapot pours itself a cup, then takes a bow…",
		ideasTitle: "Suggestions",
		ideas: [
			"The coffee cup does a little cha-cha while the steam keeps the beat.",
			"A landscape painting: wind moves through the field and the boat drifts out of the frame.",
			"A pair of slippers wanders around the house looking for their owner.",
			"The teddy bear on the shelf blinks, yawns and waves hello.",
			"A pot comes to a boil and the spring onions dance like pop stars.",
			"The motorbike in the yard shivers awake and roars off down the street.",
			"Bring this statue to life — let it breathe and move like it's real.",
			"Turn this drawing into reality, the character steps right off the page.",
			"Watch a rough sketch gradually transform into a real object, detail by detail.",
		],
		nickname: "Name to show on air",
		email: "Email (optional)",
		consent: "I agree to my photo and the result appearing on the channel.",
		retentionNote: (days: number) =>
			`Photos are deleted ${days} days after they arrive. The text stays, so keep your code and you can still look this up later.`,
		submit: "Send it",
		sending: "Sending…",
		galleryTitle: "Recently on air",
		galleryHint: "Tap any tile to watch it on the channel.",
		successTitle: "Got your idea!",
		successBody:
			"Keep this code to check whether your idea gets picked. It's remembered on this device so you can find it again, but a screenshot is safer.",
		yourCode: "Your code",
		viewStatus: "Check status",
		another: "Send another",
		closedQuota: "Today's inbox is full",
		closedQuotaBody:
			"I only take as many as I can review by hand each day. Come back later, your photos are still on your phone.",
		closedPaused: "Submissions paused",
		closedPausedBody: "I'm catching up on what's already in. Check back soon!",
		closedSetup: "Setting things up",
		closedSetupBody:
			"Bot protection isn't configured yet, so submissions are on hold to keep the inbox free of automated junk. Please check back shortly.",
		maintenanceBadge: "Under maintenance",
		maintenanceTitle: "The site is under maintenance",
		maintenanceBody:
			"I'm fixing a few things behind the scenes, so the whole site is closed for a little while. Everything you've sent, and your code, are safe. Please check back later.",
		maintenanceAdmin:
			"The site is under maintenance. You can see it because you're signed in as admin; everyone else gets the maintenance notice.",
		notFoundBadge: "404",
		notFoundTitle: "There's nothing here",
		notFoundBody:
			"The link you opened doesn't lead anywhere. It may have a typo, or been copied only halfway. If you're looking for something you sent, head to the lookup page and enter your eight-digit code.",
		backIn: "Opens again in",
		lookupTitle: "How's your idea doing?",
		lookupLead:
			"Enter the eight-digit code you got when you sent your idea. This device also remembers what you've sent.",
		lookupPlaceholder: "04829173",
		lookupBtn: "Look up",
		notFound: "No submission with that code. Please check it again.",
		tooManyLookups:
			"Too many failed lookups today. Please try again tomorrow.",
		mineTitle: "Your submissions",
		mineHint:
			"This list lives only in this browser, on this device. It is never sent anywhere. Switch devices, browse privately or clear your browsing data and it's gone, so keep your code somewhere else too.",
		mineEmpty:
			"Nothing saved on this device yet. Send your first idea and the code will show up right here.",
		mineForgetAll: "Forget on this device",
		mineForgetOne: "Remove from list",
		mineConfirm:
			"Clear the saved codes, along with the name and email remembered on this device? Your submissions stay exactly as they are, you'd only lose the shortcut back to them.",
		stepReceived: "Received",
		stepPicked: "Picked",
		stepLive: "On air",
		crashTitle: "Something broke",
		crashBody:
			"An unexpected error came up. Please reload the page. Anything you already sent is safe.",
		crashRetry: "Reload the page",
		statusNew: "Waiting for review",
		statusSelected: "Picked!",
		statusDone: "On air",
		statusRejected: "Not this time",
		statusNewBody: "I'll go through submissions over the next few days.",
		statusSelectedBody: "Yours got picked, I'm making the clip now.",
		statusDoneBody: "Your piece is live on the channel!",
		statusRejectedBody:
			"I couldn't use this one, but please do send another idea.",
		rejectReasonLabel: "Reason",
		watchNow: "Watch it",
		imagesGone:
			"The original photos have expired and been deleted. The text below is still here.",
		viewerTitle: "Photo viewer",
		viewerOpen: "View larger",
		viewerClose: "Close",
		viewerPrev: "Previous photo",
		viewerNext: "Next photo",
		privacyTitle: "Privacy Policy",
		privacyUpdated: "Last updated: August 16, 2026",
		termsTitle: "Terms of Service",
		termsUpdated: "Last updated: August 16, 2026",
		errors: {
			quota: "Today's inbox is full. Please come back later.",
			ip_limit: "You've sent quite a few today. Try again tomorrow!",
			turnstile: "Couldn't verify you're human. Please try again.",
			turnstile_unconfigured:
				"The site is still being set up, so submissions are on hold. Please check back later.",
			paused: "Submissions are paused right now. Please check back later!",
			image_size: "One of the images is too large. Please pick another.",
			image_read: "One of the images couldn't be opened. Please pick another.",
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
