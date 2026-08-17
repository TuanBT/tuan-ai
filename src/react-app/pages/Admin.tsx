import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "../components/Layout";
import { ArrowLeftIcon } from "../components/icons";
import {
	askNotifyPermission,
	markAdminSeen,
	notifyNewSubmission,
	notifyPermission,
	notifySupported,
	shortName,
	useAdminSignal,
} from "../lib/admin-session";
import { api } from "../lib/api";
import { DataPanel } from "./admin/DataPanel";
import { Inbox } from "./admin/Inbox";
import { Login } from "./admin/Login";
import { SettingsPanel } from "./admin/SettingsPanel";
import { setProdPreview } from "./admin/shared";
import { StatsPanel } from "./admin/StatsPanel";
import { StylesPanel } from "./admin/StylesPanel";

type Tab = "inbox" | "stats" | "styles" | "settings" | "data";

const TABS: Array<[Tab, string]> = [
	["inbox", "Bài gửi"],
	["stats", "Thống kê"],
	["styles", "Kiểu"],
	["settings", "Cài đặt"],
	["data", "Dữ liệu"],
];

/**
 * Nhịp hỏi lại số bài chờ.
 *
 * Một phút là đủ nhanh để người đang mở tab quản trị thấy bài vừa tới, mà vẫn
 * chỉ là sáu mươi lượt truy vấn đếm mỗi giờ — rẻ hơn nhiều so với việc chủ
 * trang tự bấm tải lại vì không tin con số đang hiện.
 */
const POLL_MS = 60_000;

export function Admin() {
	const { me, loaded, pending, arrived, clearArrived, refresh } = useAdminSignal({
		pollMs: POLL_MS,
	});

	// Tab nằm trong địa chỉ để tải lại trang không bị nhảy về mục đầu.
	const [tab, setTab] = useState<Tab>(() => {
		const fromHash = window.location.hash.replace("#", "");
		return (TABS.some(([id]) => id === fromHash) ? fromHash : "inbox") as Tab;
	});

	const waiting = pending?.new ?? 0;

	useNewSubmissionAlerts(arrived, waiting);
	useTitleBadge(waiting, Boolean(me?.session));

	function goTab(next: Tab) {
		setTab(next);
		window.history.replaceState(null, "", `#${next}`);
	}

	if (!loaded) {
		return (
			<div className="center">
				<div className="spinner" role="status" />
			</div>
		);
	}

	// Hỏi xong mà không có câu trả lời nghĩa là không gọi được máy chủ. Trước đây
	// trường hợp này rơi vào vòng quay tải mãi không dứt, không nói ra lý do.
	if (!me) {
		return (
			<div className="login">
				<div className="notice bad">
					<strong>Không gọi được máy chủ.</strong>
					<span>Kiểm tra kết nối rồi thử lại nhé.</span>
				</div>
				<button type="button" className="cta-ghost" onClick={refresh}>
					Thử lại
				</button>
				<Link className="linkish" to="/">
					<ArrowLeftIcon size={14} /> Về trang chủ
				</Link>
			</div>
		);
	}

	if (!me.session) return <Login me={me} />;
	const session = me.session;

	return (
		<div className="admin">
			<header className="topbar">
				{/* Khu quản trị trước đây là ngõ cụt: vào rồi chỉ có cách sửa thanh
				    địa chỉ mới ra được. Tên trang giờ là đường về trang chủ. */}
				<Link className="wordmark" to="/">
					<Wordmark /> <small>· Quản trị</small>
				</Link>
				<div className="admin-actions">
					{/* Ai đang đăng nhập, ngay cạnh nút thoát. Trước đây cả trang không
					    nói ra điều đó ở đâu cả, nên trên máy dùng chung thì không biết
					    mình đang là ai, mà nút "Thoát" cũng thành một cú bấm đoán mò. */}
					<span className="admin-who" title={`${session.email} · ${session.provider}`}>
						<span className="who-dot" aria-hidden="true" />
						{shortName(session.name)}
					</span>
					<Link className="ghost-btn" to="/">
						<ArrowLeftIcon size={15} /> Trang chủ
					</Link>
					<NotifyToggle />
					{me.devBypassAvailable && (
						<button
							type="button"
							className="ghost-btn"
							onClick={() => setProdPreview(true)}
							title="Tắt cửa sau để xem trang y như trên production"
						>
							Xem như production
						</button>
					)}
					<button
						type="button"
						className="ghost-btn"
						onClick={() =>
							api.logout().then(() => {
								markAdminSeen(false);
								window.location.reload();
							})
						}
					>
						Thoát
					</button>
				</div>
			</header>

			{me.devBypassAvailable && (
				<div className="notice warn">
					<strong>Đang ở chế độ phát triển.</strong>
					<span>
						Bạn được đăng nhập sẵn nhờ cửa sau trong <code>.dev.vars</code>. Trên
						production không có cửa sau này.
					</span>
				</div>
			)}

			<nav className="tabs" role="tablist">
				{TABS.map(([id, label]) => (
					<button
						key={id}
						role="tab"
						aria-selected={tab === id}
						onClick={() => goTab(id)}
					>
						{label}
						{/* Số bài chưa duyệt đứng ngay trên tên tab: mở trang lên là thấy
						    còn việc, không phải bấm vào mới biết. */}
						{id === "inbox" && waiting > 0 && (
							<em className="pip" title={`${waiting} bài chưa duyệt`}>
								{waiting}
							</em>
						)}
					</button>
				))}
			</nav>

			{tab === "inbox" && (
				<Inbox
					waiting={waiting}
					arrived={arrived}
					onSeen={clearArrived}
					onRefreshCounts={refresh}
				/>
			)}
			{tab === "stats" && <StatsPanel />}
			{tab === "styles" && <StylesPanel />}
			{tab === "settings" && <SettingsPanel />}
			{tab === "data" && <DataPanel />}

			<footer className="footer">
				<div className="footer-links">
					<Link to="/">
						<ArrowLeftIcon size={14} /> Trang chủ
					</Link>
					<Link to="/r">Tra cứu bài</Link>
				</div>
			</footer>
		</div>
	);
}

/**
 * Thông báo của trình duyệt khi có bài mới tới.
 *
 * Dải nhắc trong hộp thư chỉ với tới người đang nhìn vào tab này. Còn lại thì
 * tab quản trị nằm sau mười tab khác cả buổi, nên phải có đường đi ra ngoài
 * cửa sổ trình duyệt mới gọi là báo được.
 */
function useNewSubmissionAlerts(arrived: number, waiting: number) {
	const notified = useRef(0);

	useEffect(() => {
		if (arrived === 0) {
			notified.current = 0;
			return;
		}
		if (arrived === notified.current) return;
		notified.current = arrived;
		notifyNewSubmission(waiting);
	}, [arrived, waiting]);
}

/**
 * Số bài chờ trên chính tên tab của trình duyệt.
 *
 * Đây là thứ duy nhất nhìn thấy được khi trang bị che khuất mà không cần xin
 * quyền gì cả, nên nó là lớp báo nền: thông báo hệ thống ở trên chỉ là thêm.
 */
function useTitleBadge(waiting: number, signedIn: boolean) {
	// Tiêu đề gốc chụp đúng một lần. Chụp lại ở mỗi lượt chạy thì cái gọi là
	// "gốc" chính là tiêu đề mình vừa đặt, và rời trang sẽ trả về nhầm nó.
	const original = useRef(document.title);

	useEffect(() => {
		const base = original.current;
		document.title =
			signedIn && waiting > 0 ? `(${waiting}) Quản trị · ${base}` : `Quản trị · ${base}`;
		return () => {
			document.title = base;
		};
	}, [waiting, signedIn]);
}

/**
 * Công tắc xin quyền thông báo.
 *
 * Chỉ hiện khi còn xin được: trình duyệt đã bị bấm "chặn" thì không hỏi lại
 * được nữa, mà một cái nút bấm vào không xảy ra gì thì tệ hơn là không có nút.
 */
function NotifyToggle() {
	const [permission, setPermission] = useState(notifyPermission);

	if (!notifySupported() || permission !== "default") return null;

	return (
		<button
			type="button"
			className="ghost-btn"
			title="Cho trình duyệt báo khi có bài mới, kể cả lúc bạn đang ở tab khác"
			onClick={() => askNotifyPermission().then(setPermission)}
		>
			Bật thông báo
		</button>
	);
}
