import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { readLocal, removeLocal, writeLocal } from "./local";

export type AdminMe = Awaited<ReturnType<typeof api.me>>;
export type AdminPending = Awaited<ReturnType<typeof api.adminPending>>;

/**
 * Dấu vết "máy này từng đăng nhập quản trị".
 *
 * Cookie phiên là HttpOnly nên trang không tự đọc được: muốn biết mình đã đăng
 * nhập hay chưa thì phải hỏi máy chủ. Nhưng chân trang có mặt ở *mọi* trang, mà
 * gần như mọi lượt xem đều là khách lạ — bắt tất cả trả thêm một lượt gọi
 * `/api/me` chỉ để biết câu trả lời gần như luôn là "không" thì quá đắt.
 *
 * Nên dấu này là cái công tắc: chỉ máy từng đăng nhập mới hỏi. Nó không phải
 * quyền hạn gì cả — ai cũng tự đặt được vào localStorage, và đặt xong thì cũng
 * chỉ nhận về đúng câu "chưa đăng nhập" từ máy chủ.
 */
const SEEN_KEY = "tuanai_admin_v1";

export function markAdminSeen(on: boolean): void {
	if (on) writeLocal(SEEN_KEY, "1");
	else removeLocal(SEEN_KEY);
}

export function adminSeen(): boolean {
	return readLocal(SEEN_KEY) === "1";
}

/**
 * Tên gọn để hiện trên một dòng chữ nhỏ.
 *
 * Google trả về họ tên đầy đủ ("Bùi Thanh Tuấn"), GitHub có khi chỉ có mỗi
 * email. Trong tiếng Việt tên gọi nằm ở cuối, nên lấy từ cuối cùng; còn email
 * thì lấy phần trước dấu @, vì cả cái đuôi tên miền không nói thêm điều gì.
 */
export function shortName(full: string): string {
	const trimmed = full.trim();
	if (!trimmed) return "";
	if (trimmed.includes("@")) return trimmed.split("@")[0].slice(0, 20);

	const words = trimmed.split(/\s+/);
	const last = words[words.length - 1];
	// Tên một chữ dài quá thì cắt, để chân trang không bị đẩy vỡ hàng.
	return last.length > 20 ? `${last.slice(0, 20)}…` : last;
}

interface Options {
	/** Không bật thì hook không gọi mạng lần nào. */
	enabled?: boolean;
	/** Khoảng cách giữa hai lượt hỏi lại, tính bằng mili giây. 0 là hỏi một lần. */
	pollMs?: number;
}

interface Signal {
	me: AdminMe | null;
	/** Đã hỏi xong máy chủ chưa. Khác `me === null` là "hỏi rồi, chưa đăng nhập". */
	loaded: boolean;
	pending: AdminPending | null;
	/** Số bài vừa tới *trong lúc trang đang mở*. 0 nghĩa là chưa có gì mới. */
	arrived: number;
	/** Đã xem rồi: xoá dấu "vừa tới" mà không đụng tới con số đang chờ. */
	clearArrived: () => void;
	refresh: () => void;
}

/**
 * Phiên quản trị và số bài đang chờ, hỏi lại theo nhịp.
 *
 * Dùng chung cho hai chỗ rất khác nhau: chân trang công khai (hỏi một lần, chỉ
 * khi máy này từng đăng nhập) và trang quản trị (hỏi lại đều đặn để biết có bài
 * mới tới). Gộp vào một hook vì cả hai đều cần đúng cặp "ai đang đăng nhập" và
 * "còn bao nhiêu bài chờ", và tách ra thì hai bản sẽ trôi khỏi nhau.
 */
export function useAdminSignal({ enabled = true, pollMs = 0 }: Options = {}): Signal {
	const [me, setMe] = useState<AdminMe | null>(null);
	const [fetched, setFetched] = useState(false);
	const [pending, setPending] = useState<AdminPending | null>(null);
	const [arrived, setArrived] = useState(0);

	// Mốc bài mới nhất ở lượt hỏi trước. Nằm trong ref chứ không phải state: nó
	// chỉ để so sánh, mà đưa vào state thì mỗi lượt hỏi lại vẽ lại cả cây.
	const lastSeen = useRef<number | null>(null);
	const [tick, setTick] = useState(0);

	const refresh = useCallback(() => setTick((n) => n + 1), []);
	const clearArrived = useCallback(() => setArrived(0), []);

	useEffect(() => {
		if (!enabled) return;

		let alive = true;

		async function read() {
			let session: AdminMe | null = null;
			try {
				session = await api.me();
			} catch {
				// Mất mạng thì giữ nguyên thứ đang hiện, đừng đá người dùng ra. Vẫn
				// đánh dấu "hỏi xong" để trang khỏi quay vòng tròn mãi ở lượt đầu.
				if (alive) setFetched(true);
				return;
			}
			if (!alive) return;

			setMe(session);
			setFetched(true);
			markAdminSeen(Boolean(session.session));
			if (!session.session) {
				setPending(null);
				return;
			}

			try {
				const counts = await api.adminPending();
				if (!alive) return;
				setPending(counts);

				// Chỉ báo "vừa có bài mới" khi thấy bài mới hơn lần hỏi trước. Lượt
				// hỏi đầu tiên không báo: lúc đó mọi bài chưa duyệt đều "mới" với
				// trang, mà với người đang mở trang thì chúng là hàng tồn.
				const previous = lastSeen.current;
				if (
					previous !== null &&
					counts.latestAt !== null &&
					counts.latestAt > previous
				) {
					setArrived((n) => n + 1);
				}
				if (counts.latestAt !== null) lastSeen.current = counts.latestAt;
				else lastSeen.current = 0;
			} catch {
				// Hết phiên giữa chừng cũng rơi vào đây; lượt `api.me()` sau sẽ dọn.
			}
		}

		read();
		if (!pollMs) return () => { alive = false; };

		const timer = setInterval(() => {
			// Tab đang ẩn thì đừng hỏi: máy chủ khỏi phải trả lời cho một trang
			// không ai nhìn, và lượt hỏi ngay khi quay lại tab mới là lượt đáng giá.
			if (document.visibilityState === "visible") read();
		}, pollMs);
		const onVisible = () => {
			if (document.visibilityState === "visible") read();
		};
		document.addEventListener("visibilitychange", onVisible);

		return () => {
			alive = false;
			clearInterval(timer);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [enabled, pollMs, tick]);

	// Không bật thì không có gì để chờ: coi như đã hỏi xong ngay từ đầu.
	return { me, loaded: !enabled || fetched, pending, arrived, clearArrived, refresh };
}

/**
 * Thông báo của trình duyệt: thứ duy nhất với tới được chủ trang khi tab quản
 * trị đang nằm sau mười tab khác.
 *
 * Xin quyền phải do một cú bấm gọi ra, không phải tự nhảy lên lúc mở trang —
 * hộp thoại xin quyền hiện ra không rõ lý do thì gần như ai cũng bấm "chặn", mà
 * chặn rồi thì không hỏi lại được nữa.
 */
export function notifySupported(): boolean {
	return typeof Notification !== "undefined";
}

export function notifyPermission(): NotificationPermission | null {
	return notifySupported() ? Notification.permission : null;
}

export async function askNotifyPermission(): Promise<NotificationPermission | null> {
	if (!notifySupported()) return null;
	try {
		return await Notification.requestPermission();
	} catch {
		return null;
	}
}

export function notifyNewSubmission(count: number): void {
	if (!notifySupported() || Notification.permission !== "granted") return;
	try {
		new Notification("Tuân AI · có bài mới", {
			body: count > 1 ? `${count} bài đang chờ duyệt.` : "Một bài đang chờ duyệt.",
			icon: "/icons/icon.svg",
			// Cùng một thẻ thì thông báo sau thay chỗ thông báo trước, không xếp
			// chồng thành một cột dài sau một buổi vắng mặt.
			tag: "tuanai-inbox",
		});
	} catch {
		// Vài trình duyệt trên điện thoại chỉ cho tạo thông báo từ service worker.
	}
}
