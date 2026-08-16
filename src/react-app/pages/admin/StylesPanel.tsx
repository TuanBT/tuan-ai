import { useCallback, useEffect, useState } from "react";
import { api, type AdminStyle } from "../../lib/api";

export function StylesPanel() {
	const [items, setItems] = useState<AdminStyle[]>([]);
	const [draft, setDraft] = useState({ id: "", label_vi: "", label_en: "" });

	const load = useCallback(() => {
		api.adminStyles().then((data) => setItems(data.items)).catch(() => {});
	}, []);

	useEffect(load, [load]);

	async function add(event: React.FormEvent) {
		event.preventDefault();
		if (!draft.id || !draft.label_vi) return;
		await api.adminStyleSave({ ...draft, sort_order: items.length + 1 });
		setDraft({ id: "", label_vi: "", label_en: "" });
		load();
	}

	return (
		<>
			<p className="hint">
				Đây là các lựa chọn người dùng thấy khi gửi bài. Tắt thì ẩn khỏi form
				nhưng bài cũ vẫn giữ nguyên.
			</p>

			<div className="rows">
				{items.map((style) => (
					<div className="row" key={style.id}>
						<div className="row-label">
							<strong>{style.label_vi}</strong>
							<small>
								{style.id} · {style.label_en}
							</small>
						</div>
						<button
							type="button"
							className="chip"
							aria-pressed={style.active === 1}
							onClick={async () => {
								await api.adminStylePatch(style.id, { active: !style.active });
								load();
							}}
						>
							{style.active ? "Đang hiện" : "Đang ẩn"}
						</button>
						<button
							type="button"
							className="chip"
							onClick={async () => {
								if (!confirm(`Xoá kiểu “${style.label_vi}”?`)) return;
								await api.adminStyleDelete(style.id);
								load();
							}}
						>
							Xoá
						</button>
					</div>
				))}
			</div>

			<form className="row" onSubmit={add}>
				<input
					className="input"
					placeholder="mã (vd: sketch)"
					value={draft.id}
					onChange={(e) => setDraft({ ...draft, id: e.target.value })}
				/>
				<input
					className="input"
					placeholder="Nhãn tiếng Việt"
					value={draft.label_vi}
					onChange={(e) => setDraft({ ...draft, label_vi: e.target.value })}
				/>
				<input
					className="input"
					placeholder="Nhãn tiếng Anh"
					value={draft.label_en}
					onChange={(e) => setDraft({ ...draft, label_en: e.target.value })}
				/>
				<button className="cta" type="submit" style={{ padding: "10px 18px" }}>
					Thêm
				</button>
			</form>
		</>
	);
}
