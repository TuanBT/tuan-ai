import { useEffect, useState } from "react";
import { api, type AdminSettings } from "../../lib/api";

const SETTING_LABELS: Array<[keyof AdminSettings, string, string]> = [
	["retention_days", "Số ngày giữ ảnh", "Sau ngần này ngày ảnh gốc tự xoá."],
	[
		"data_retention_days",
		"Số ngày giữ email",
		"Sau ngần này ngày, email và dấu vết địa chỉ mạng bị xoá. Phần mô tả và link thì giữ lại, để người gửi cầm mã vẫn tra được về sau. Không ngắn hơn số ngày giữ ảnh.",
	],
	["max_images", "Số ảnh tối đa mỗi bài", "Từ 1 đến 5."],
	[
		"daily_write_budget",
		"Ngân sách ghi mỗi ngày",
		"Trần thật của KV là 1.000. Để 850 cho an toàn.",
	],
	["max_per_ip_day", "Số bài tối đa mỗi người/ngày", "Tính theo địa chỉ mạng."],
	["site_title", "Tên hiển thị", ""],
	["tagline_vi", "Câu giới thiệu (Việt)", ""],
	["tagline_en", "Câu giới thiệu (Anh)", ""],
	[
		"tiktok_url",
		"Link kênh TikTok",
		"Dán đầy đủ dạng https://… Để trống thì trang giấu nút đi.",
	],
	[
		"youtube_url",
		"Link kênh YouTube",
		"Dán đầy đủ dạng https://… Để trống thì trang giấu nút đi.",
	],
];

export function SettingsPanel() {
	const [settings, setSettings] = useState<AdminSettings | null>(null);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		api.adminSettings().then(setSettings).catch(() => {});
	}, []);

	if (!settings) {
		return (
			<div className="center">
				<div className="spinner" role="status" />
			</div>
		);
	}

	async function save(patch: Partial<AdminSettings>) {
		const next = await api.adminSettingsSave(patch);
		setSettings(next);
		setSaved(true);
		setTimeout(() => setSaved(false), 1600);
	}

	return (
		<>
			<div className="row">
				<div className="row-label">
					<strong>Nhận bài</strong>
					<small>Tắt thì trang chủ hiện thông báo tạm ngưng.</small>
				</div>
				<button
					type="button"
					className="chip"
					aria-pressed={settings.submissions_open}
					onClick={() => save({ submissions_open: !settings.submissions_open })}
				>
					{settings.submissions_open ? "Đang mở" : "Đang đóng"}
				</button>
			</div>

			<div className="rows">
				{SETTING_LABELS.map(([key, label, hint]) => (
					<div className="row" key={key}>
						<div className="row-label">
							<strong>{label}</strong>
							{hint && <small>{hint}</small>}
						</div>
						<input
							className="input"
							defaultValue={String(settings[key])}
							onBlur={(e) => {
								if (e.target.value !== String(settings[key])) {
									save({ [key]: e.target.value } as Partial<AdminSettings>);
								}
							}}
						/>
					</div>
				))}
			</div>

			<p className="hint">
				Đổi số ngày giữ ảnh sẽ có hiệu lực với cả bài cũ, bản quét chạy mỗi
				đêm sẽ dọn những bài đã quá hạn mới.
			</p>

			{saved && <div className="notice warn">Đã lưu.</div>}
		</>
	);
}
