import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { DataPanel } from "./admin/DataPanel";
import { Inbox } from "./admin/Inbox";
import { Login } from "./admin/Login";
import { SettingsPanel } from "./admin/SettingsPanel";
import { setProdPreview, type Me } from "./admin/shared";
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

export function Admin() {
	const [me, setMe] = useState<Me | null>(null);
	// Tab nằm trong địa chỉ để tải lại trang không bị nhảy về mục đầu.
	const [tab, setTab] = useState<Tab>(() => {
		const fromHash = window.location.hash.replace("#", "");
		return (TABS.some(([id]) => id === fromHash) ? fromHash : "inbox") as Tab;
	});

	function goTab(next: Tab) {
		setTab(next);
		window.history.replaceState(null, "", `#${next}`);
	}

	useEffect(() => {
		api.me().then(setMe).catch(() => setMe(null));
	}, []);

	if (!me) {
		return (
			<div className="center">
				<div className="spinner" role="status" />
			</div>
		);
	}

	if (!me.session) return <Login me={me} />;

	return (
		<div className="admin">
			<header className="topbar">
				<strong>Tuân AI · Quản trị</strong>
				<div style={{ display: "flex", gap: 8 }}>
					{me.devBypassAvailable && (
						<button
							type="button"
							className="cta-ghost"
							style={{ padding: "7px 14px", fontSize: 13 }}
							onClick={() => setProdPreview(true)}
							title="Tắt cửa sau để xem trang y như trên production"
						>
							Xem như production
						</button>
					)}
					<button
						type="button"
						className="cta-ghost"
						style={{ padding: "7px 14px", fontSize: 13 }}
						onClick={() => api.logout().then(() => window.location.reload())}
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
					</button>
				))}
			</nav>

			{tab === "inbox" && <Inbox />}
			{tab === "stats" && <StatsPanel />}
			{tab === "styles" && <StylesPanel />}
			{tab === "settings" && <SettingsPanel />}
			{tab === "data" && <DataPanel />}
		</div>
	);
}
