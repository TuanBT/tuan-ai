/*
 * Service Worker — Tuân AI
 *
 * Chiến lược: network-first cho mọi thứ, có cache fallback khi offline.
 * Trang là SPA nên chỉ cần cache shell (HTML + JS + CSS) là đủ để hiện giao
 * diện khi mất mạng. API calls sẽ thất bại nhưng app không trắng trang.
 */

const CACHE_NAME = "tuanai-v1";

/*
 * Khi install, cache trang chủ. Các asset khác (JS, CSS) sẽ được cache
 * tự động khi người dùng truy cập lần đầu nhờ chiến lược stale-while-revalidate.
 */
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.add("/")),
	);
	// Không chờ tab cũ đóng, kích hoạt ngay.
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	// Xoá cache cũ khi phiên bản mới lên.
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME)
					.map((key) => caches.delete(key)),
			),
		),
	);
	// Chiếm quyền điều khiển tab đang mở ngay lập tức.
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const { request } = event;

	// Chỉ xử lý GET; POST/PATCH/DELETE không cache được.
	if (request.method !== "GET") return;

	const url = new URL(request.url);

	// Bỏ qua các request không phải cùng origin.
	if (url.origin !== self.location.origin) return;

	// API calls: network-only, không cache.
	if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
		return;
	}

	// Assets tĩnh (JS, CSS, icons, ảnh): stale-while-revalidate.
	// HTML navigation: network-first với fallback cache.
	if (request.mode === "navigate") {
		event.respondWith(networkFirst(request));
	} else {
		event.respondWith(staleWhileRevalidate(request));
	}
});

/**
 * Network-first: thử mạng trước, nếu hỏng thì dùng cache.
 * Dùng cho navigation requests (HTML).
 */
async function networkFirst(request) {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(CACHE_NAME);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await caches.match(request);
		// SPA: mọi navigation đều trả về cùng một index.html.
		return cached || caches.match("/");
	}
}

/**
 * Stale-while-revalidate: trả cache ngay nếu có, đồng thời cập nhật cache
 * ở background. Lần sau sẽ nhận bản mới.
 */
async function staleWhileRevalidate(request) {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request);

	const fetchPromise = fetch(request)
		.then((response) => {
			if (response.ok) {
				cache.put(request, response.clone());
			}
			return response;
		})
		.catch(() => cached);

	return cached || fetchPromise;
}
