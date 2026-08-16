export interface Style {
	id: string;
	label_vi: string;
	label_en: string;
}

export interface Channels {
	tiktok: string | null;
	youtube: string | null;
}

export interface SiteConfig {
	siteTitle: string;
	tagline: { vi: string; en: string };
	channels: Channels;
	styles: Style[];
	maxImages: number;
	retentionDays: number;
	turnstileSiteKey: string | null;
	open: boolean;
	closedReason: "paused" | "quota" | "setup" | null;
	resetInSeconds: number;
}

export interface Submission {
	code: string;
	nickname: string;
	description: string;
	styles: string[];
	status: "new" | "selected" | "done" | "rejected";
	publishedUrl: string | null;
	createdAt: number;
	expiresAt: number;
	imageUrls: string[];
}

export interface GalleryItem {
	nickname: string;
	publishedUrl: string;
	thumb: string | null;
}

export class ApiError extends Error {
	constructor(public code: string) {
		super(code);
	}
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
	let res: Response;
	try {
		res = await fetch(url, init);
	} catch {
		throw new ApiError("network");
	}

	let body: unknown = null;
	try {
		body = await res.json();
	} catch {
		body = null;
	}

	if (!res.ok) {
		const error =
			body && typeof body === "object" && "error" in body
				? String((body as { error: unknown }).error)
				: "generic";
		throw new ApiError(error);
	}
	return body as T;
}

/** Bộ lọc hộp thư dạng chuỗi truy vấn, dùng chung cho danh sách và gói tải. */
function inboxQuery(status: string, search: string): string {
	const query = new URLSearchParams();
	if (status) query.set("status", status);
	if (search) query.set("q", search);
	return query.size ? `?${query}` : "";
}

export const api = {
	config: () => request<SiteConfig>("/api/config"),
	gallery: () => request<{ items: GalleryItem[] }>("/api/gallery"),
	lookup: (code: string) =>
		request<Submission>(`/api/s/${encodeURIComponent(code)}`),
	submit: (form: FormData) =>
		request<{ code: string }>("/api/submit", { method: "POST", body: form }),

	me: () =>
		request<{
			session: { email: string; name: string; provider: string } | null;
			providers: { google: boolean; github: boolean };
			configured: boolean;
			devBypassAvailable: boolean;
			prodPreview: boolean;
		}>("/api/me"),
	logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),

	adminList: (status: string, search = "") =>
		request<{
			items: AdminSubmission[];
			counts: Record<string, number>;
		}>(`/api/admin/submissions${inboxQuery(status, search)}`),
	adminPatch: (code: string, patch: Record<string, unknown>) =>
		request<{ ok: true }>(`/api/admin/submissions/${code}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(patch),
		}),
	adminDelete: (code: string) =>
		request<{ ok: true }>(`/api/admin/submissions/${code}`, {
			method: "DELETE",
		}),
	/*
	 * Hai đường tải gói trả về địa chỉ chứ không tự gọi `fetch`.
	 *
	 * Phiên đăng nhập nằm trong cookie nên thẻ <a download> đi thẳng được, và làm
	 * vậy thì trình duyệt lo phần tải: có thanh tiến trình, ghi thẳng ra ổ đĩa,
	 * huỷ được giữa chừng. Gọi `fetch` rồi dựng Blob thì gói cả trăm MB phải nằm
	 * trọn trong bộ nhớ tab, mà người bấm không thấy gì đang xảy ra.
	 */
	adminBundleUrl: (code: string) =>
		`/api/admin/bundle/${encodeURIComponent(code)}`,
	adminBundleAllUrl: (status: string, search = "") =>
		`/api/admin/bundle.zip${inboxQuery(status, search)}`,

	adminStats: () => request<Stats>("/api/admin/stats"),
	adminStyles: () => request<{ items: AdminStyle[] }>("/api/admin/styles"),
	adminStyleSave: (style: Partial<AdminStyle>) =>
		request<{ ok: true }>("/api/admin/styles", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(style),
		}),
	adminStylePatch: (id: string, patch: Record<string, unknown>) =>
		request<{ ok: true }>(`/api/admin/styles/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(patch),
		}),
	adminStyleDelete: (id: string) =>
		request<{ ok: true }>(`/api/admin/styles/${id}`, { method: "DELETE" }),
	adminSettings: () => request<AdminSettings>("/api/admin/settings"),
	adminSettingsSave: (patch: Partial<AdminSettings>) =>
		request<AdminSettings>("/api/admin/settings", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(patch),
		}),

	adminData: () =>
		request<{
			tables: Array<{ name: string; rows: number }>;
			duePurge: number;
			dueClear: number;
			dataRetentionDays: number;
		}>("/api/admin/data"),
	adminQuery: (sql: string) =>
		request<{
			sql: string;
			columns: string[];
			rows: Array<Record<string, unknown>>;
		}>("/api/admin/query", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ sql }),
		}),
	adminPurge: () =>
		request<{ images: number; identitiesCleared: number }>("/api/admin/purge", {
			method: "POST",
		}),
	adminReset: (target: "stats" | "lookups" | "submissions") =>
		request<{ ok: true; deleted?: number }>("/api/admin/reset", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ target }),
		}),
};

export interface AdminSubmission extends Omit<Submission, "status"> {
	email: string | null;
	status: string;
	adminNote: string | null;
	lang: string;
	bytes: number;
	imagesPurged: boolean;
}

export interface AdminStyle {
	id: string;
	label_vi: string;
	label_en: string;
	sort_order: number;
	active: number;
}

export interface AdminSettings {
	retention_days: number;
	data_retention_days: number;
	max_images: number;
	daily_write_budget: number;
	max_per_ip_day: number;
	submissions_open: boolean;
	site_title: string;
	tagline_vi: string;
	tagline_en: string;
	tiktok_url: string;
	youtube_url: string;
}

export interface Stats {
	today: {
		day: string;
		submissions: number;
		kv_writes: number;
		blocked: number;
		bytes: number;
	};
	remainingWrites: number;
	writeBudget: number;
	kvFreeDailyWrites: number;
	storedBytes: number;
	storedSubmissions: number;
	storageLimitBytes: number;
	history: Array<{
		day: string;
		submissions: number;
		kv_writes: number;
		blocked: number;
		bytes: number;
	}>;
	shouldUpgrade: boolean;
	turnstileConfigured: boolean;
}
