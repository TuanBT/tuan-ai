import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { AdminSession } from "../lib/session";
import {
	clearCookie,
	isAdminEmail,
	issueSession,
	readSession,
	SESSION_COOKIE,
	sessionCookie,
} from "../lib/session";
import { b64urlEncode, timingSafeEqual } from "../lib/util";

const STATE_COOKIE = "tuanai_oauth";

type Provider = "google" | "github";

interface ProviderConfig {
	clientId?: string;
	clientSecret?: string;
	authorizeUrl: string;
	tokenUrl: string;
	scope: string;
}

function providerConfig(env: Env, provider: Provider): ProviderConfig | null {
	if (provider === "google") {
		return {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
			tokenUrl: "https://oauth2.googleapis.com/token",
			scope: "openid email profile",
		};
	}
	if (provider === "github") {
		return {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
			authorizeUrl: "https://github.com/login/oauth/authorize",
			tokenUrl: "https://github.com/login/oauth/access_token",
			scope: "read:user user:email",
		};
	}
	return null;
}

async function fetchIdentity(
	provider: Provider,
	accessToken: string,
): Promise<{ email: string; name: string } | null> {
	const headers = {
		Authorization: `Bearer ${accessToken}`,
		Accept: "application/json",
		"User-Agent": "tuan-ai",
	};

	if (provider === "google") {
		const res = await fetch(
			"https://openidconnect.googleapis.com/v1/userinfo",
			{ headers },
		);
		if (!res.ok) return null;
		const user = (await res.json()) as {
			email?: string;
			email_verified?: boolean;
			name?: string;
		};
		if (!user.email || user.email_verified === false) return null;
		return { email: user.email, name: user.name ?? user.email };
	}

	const [userRes, emailRes] = await Promise.all([
		fetch("https://api.github.com/user", { headers }),
		fetch("https://api.github.com/user/emails", { headers }),
	]);
	if (!userRes.ok) return null;

	const user = (await userRes.json()) as { login?: string; name?: string };
	let email: string | undefined;
	if (emailRes.ok) {
		const emails = (await emailRes.json()) as Array<{
			email: string;
			primary: boolean;
			verified: boolean;
		}>;
		email = emails.find((e) => e.primary && e.verified)?.email;
	}
	if (!email) return null;
	return { email, name: user.name ?? user.login ?? email };
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

/** Cookie do trang /admin đặt để tạm tắt cửa sau, xem trang y như production. */
export const DEV_MODE_COOKIE = "tuanai_devmode";

/**
 * Cửa sau chỉ dành cho máy lập trình, để không phải dựng OAuth mới test được
 * trang quản trị.
 *
 * Hai lớp khoá độc lập: DEV_ADMIN_BYPASS chỉ nằm trong .dev.vars (không bao giờ
 * được đẩy lên Cloudflare), và kể cả nếu biến đó lọt lên production thì yêu cầu
 * vẫn phải đến từ localhost. Chỉ một lớp hỏng thì cửa vẫn đóng.
 */
function devSession(
	env: Env,
	url: string,
	cookies: string,
): AdminSession | null {
	if (env.DEV_ADMIN_BYPASS !== "1") return null;
	if (!LOCAL_HOSTS.has(new URL(url).hostname)) return null;
	// Bấm "Xem như production" trong /admin đặt cookie này để tắt cửa sau.
	if (cookies.includes(`${DEV_MODE_COOKIE}=prod`)) return null;
	const email = (env.ADMIN_EMAILS ?? "dev@localhost").split(",")[0].trim();
	return {
		email,
		name: "Chế độ phát triển",
		provider: "google",
		exp: Math.floor(Date.now() / 1000) + 3600,
	};
}

export function authRoutes() {
	const app = new Hono<{ Bindings: Env }>();

	app.get("/auth/:provider", async (c) => {
		const provider = c.req.param("provider") as Provider;
		const config = providerConfig(c.env, provider);
		if (!config?.clientId || !config.clientSecret) {
			return c.text(`Chưa cấu hình đăng nhập ${provider}.`, 501);
		}

		const url = new URL(c.req.url);
		const state = b64urlEncode(crypto.getRandomValues(new Uint8Array(16)));

		setCookie(c, STATE_COOKIE, `${provider}:${state}`, {
			path: "/",
			httpOnly: true,
			sameSite: "Lax",
			secure: url.protocol === "https:",
			maxAge: 600,
		});

		const authorize = new URL(config.authorizeUrl);
		authorize.searchParams.set("client_id", config.clientId);
		authorize.searchParams.set(
			"redirect_uri",
			`${url.origin}/auth/${provider}/callback`,
		);
		authorize.searchParams.set("response_type", "code");
		authorize.searchParams.set("scope", config.scope);
		authorize.searchParams.set("state", state);

		return c.redirect(authorize.toString());
	});

	app.get("/auth/:provider/callback", async (c) => {
		const provider = c.req.param("provider") as Provider;
		const config = providerConfig(c.env, provider);
		const url = new URL(c.req.url);
		const secure = url.protocol === "https:";

		if (!config?.clientId || !config.clientSecret) {
			return c.redirect("/admin?error=chua-cau-hinh");
		}

		const expected = getCookie(c, STATE_COOKIE) ?? "";
		const received = `${provider}:${url.searchParams.get("state") ?? ""}`;
		if (!expected || !timingSafeEqual(expected, received)) {
			return c.redirect("/admin?error=state");
		}

		const code = url.searchParams.get("code");
		if (!code) return c.redirect("/admin?error=khong-co-ma");

		const tokenRes = await fetch(config.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
				"User-Agent": "tuan-ai",
			},
			body: new URLSearchParams({
				client_id: config.clientId,
				client_secret: config.clientSecret,
				code,
				grant_type: "authorization_code",
				redirect_uri: `${url.origin}/auth/${provider}/callback`,
			}),
		});
		if (!tokenRes.ok) return c.redirect("/admin?error=doi-ma-that-bai");

		const token = (await tokenRes.json()) as { access_token?: string };
		if (!token.access_token) return c.redirect("/admin?error=khong-co-token");

		const identity = await fetchIdentity(provider, token.access_token);
		if (!identity) return c.redirect("/admin?error=khong-doc-duoc-email");

		if (!isAdminEmail(identity.email, c.env.ADMIN_EMAILS)) {
			c.header("Set-Cookie", clearCookie(STATE_COOKIE, secure));
			return c.redirect("/admin?error=khong-co-quyen");
		}

		const session = await issueSession(
			{ email: identity.email, name: identity.name, provider },
			c.env.SESSION_SECRET,
		);

		c.header("Set-Cookie", clearCookie(STATE_COOKIE, secure));
		c.header("Set-Cookie", sessionCookie(session, secure), { append: true });
		return c.redirect("/admin");
	});

	app.post("/auth/logout", (c) => {
		const secure = new URL(c.req.url).protocol === "https:";
		c.header("Set-Cookie", clearCookie(SESSION_COOKIE, secure));
		return c.json({ ok: true });
	});

	app.get("/api/me", async (c) => {
		const cookies = c.req.raw.headers.get("cookie") ?? "";
		const dev = devSession(c.env, c.req.url, cookies);
		const session =
			dev ??
			(await readSession(getCookie(c, SESSION_COOKIE), c.env.SESSION_SECRET));
		return c.json({
			session,
			// Cho giao diện biết có nên hiện công tắc chuyển chế độ hay không.
			devBypassAvailable:
				c.env.DEV_ADMIN_BYPASS === "1" &&
				LOCAL_HOSTS.has(new URL(c.req.url).hostname),
			prodPreview: cookies.includes(`${DEV_MODE_COOKIE}=prod`),
			providers: {
				google: Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
				github: Boolean(c.env.GITHUB_CLIENT_ID && c.env.GITHUB_CLIENT_SECRET),
			},
			configured: Boolean(c.env.ADMIN_EMAILS),
		});
	});

	return app;
}

export async function requireAdmin(c: {
	req: { raw: Request };
	env: Env;
}): Promise<boolean> {
	const cookie = c.req.raw.headers.get("cookie") ?? "";
	if (devSession(c.env, c.req.raw.url, cookie)) return true;
	const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
	const session = await readSession(match?.[1], c.env.SESSION_SECRET);
	return Boolean(session && isAdminEmail(session.email, c.env.ADMIN_EMAILS));
}
