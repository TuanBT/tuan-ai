import { b64urlDecode, b64urlEncode, timingSafeEqual } from "./util";

export const SESSION_COOKIE = "tuanai_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export interface AdminSession {
	email: string;
	name: string;
	provider: "google" | "github";
	exp: number;
}

async function key(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
}

async function sign(payload: string, secret: string): Promise<string> {
	const mac = await crypto.subtle.sign(
		"HMAC",
		await key(secret),
		new TextEncoder().encode(payload),
	);
	return b64urlEncode(new Uint8Array(mac));
}

export async function issueSession(
	session: Omit<AdminSession, "exp">,
	secret: string,
): Promise<string> {
	const payload: AdminSession = {
		...session,
		exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
	};
	const body = b64urlEncode(
		new TextEncoder().encode(JSON.stringify(payload)),
	);
	return `${body}.${await sign(body, secret)}`;
}

export async function readSession(
	token: string | undefined,
	secret: string,
): Promise<AdminSession | null> {
	if (!token) return null;
	const [body, mac] = token.split(".");
	if (!body || !mac) return null;
	if (!timingSafeEqual(mac, await sign(body, secret))) return null;

	try {
		const session = JSON.parse(
			new TextDecoder().decode(b64urlDecode(body)),
		) as AdminSession;
		if (session.exp * 1000 < Date.now()) return null;
		return session;
	} catch {
		return null;
	}
}

export function sessionCookie(token: string, secure: boolean): string {
	const flags = [
		`${SESSION_COOKIE}=${token}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		`Max-Age=${MAX_AGE_SECONDS}`,
	];
	if (secure) flags.push("Secure");
	return flags.join("; ");
}

export function clearCookie(name: string, secure: boolean): string {
	const flags = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
	if (secure) flags.push("Secure");
	return flags.join("; ");
}

/** Chỉ những địa chỉ trong ADMIN_EMAILS mới vào được /admin. */
export function isAdminEmail(email: string, allowlist: string | undefined) {
	if (!allowlist) return false;
	const normalized = email.trim().toLowerCase();
	return allowlist
		.split(",")
		.map((entry) => entry.trim().toLowerCase())
		.filter(Boolean)
		.includes(normalized);
}
