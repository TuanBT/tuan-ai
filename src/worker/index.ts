import { Hono } from "hono";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { publicRoutes } from "./routes/public";
import { purgeExpired } from "./lib/purge";
import { securityHeaders } from "./lib/headers";

const app = new Hono<{ Bindings: Env }>();

app.use("*", securityHeaders);

app.route("/", authRoutes());
app.route("/", publicRoutes());
app.route("/", adminRoutes());

export default {
	fetch: app.fetch,
	async scheduled(_event, env, ctx) {
		ctx.waitUntil(purgeExpired(env));
	},
} satisfies ExportedHandler<Env>;
