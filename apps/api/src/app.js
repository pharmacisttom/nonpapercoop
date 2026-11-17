import express from "express";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { validateIdentity } from "./identity.js";
import { mountEnterprise } from "./modules/routes.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const token = () => randomBytes(32).toString("hex");
const equal = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const roles = z.enum([
  "system_admin",
  "security_admin",
  "records_officer",
  "department_staff",
  "department_head",
  "manager",
  "chairperson",
  "board_member",
  "finance_officer",
  "procurement_officer",
  "auditor_readonly",
  "member_service_officer",
]);
const userInput = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    role: roles,
    googleSub: z.string().regex(/^[0-9]{1,255}$/),
  })
  .strict();
const docInput = z
  .object({
    title: z.string().trim().min(1).max(250),
    category: z.enum([
      "general",
      "saraban",
      "board",
      "finance",
      "procurement",
      "member",
    ]),
  })
  .strict();
const idInput = z.uuid();
const fail = (status, message) => Object.assign(new Error(message), { status });
const regenerate = (s) =>
  new Promise((resolve, reject) =>
    s.regenerate((e) => (e ? reject(e) : resolve())),
  );
const save = (s) =>
  new Promise((resolve, reject) => s.save((e) => (e ? reject(e) : resolve())));

export function createApp({
  config,
  repo,
  store,
  verify,
  clock = Date.now,
  storageOverride,
}) {
  if (!store) throw new Error("Explicit session store required");
  const app = express();
  app.disable("x-powered-by");
  // A dedicated Nginx is the only trusted proxy. Node binds loopback.
  app.set("trust proxy", "loopback");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://accounts.google.com/gsi/client"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://accounts.google.com/gsi/style",
          ],
          frameSrc: ["https://accounts.google.com"],
          connectSrc: ["'self'", "https://accounts.google.com/gsi/"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.secure ? [] : null,
        },
      },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    }),
  );
  app.use(express.json({ limit: "24kb" }));
  app.use(
    "/api/v1",
    session({
      name: config.secure ? "__Host-npc.sid" : "npc.test.sid",
      secret: config.secret,
      store,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: config.secure,
        sameSite: "lax",
        maxAge: 30 * 60 * 1000,
        path: "/",
      },
    }),
  );
  app.use("/api/v1", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    const requestId = token().slice(0, 24);
    res.set("X-Request-ID", requestId);
    const json = res.json.bind(res);
    res.json = (body) =>
      json({
        success: res.statusCode < 400,
        data: res.statusCode < 400 ? body : null,
        meta: null,
        error:
          res.statusCode >= 400
            ? { code: "HTTP_" + res.statusCode, message: body.error }
            : null,
        requestId,
      });
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    if (
      req.get("origin") !== config.origin ||
      !equal(req.get("x-csrf-token"), req.session.csrf)
    )
      return next(fail(403, "CSRF validation failed"));
    next();
  });
  const authenticated = async (req, res, next) => {
    if (
      !req.session.userId ||
      clock() - req.session.loginAt > 8 * 60 * 60 * 1000
    )
      throw fail(401, "กรุณาเข้าสู่ระบบ");
    const u = await repo.user(req.session.userId);
    if (
      !u ||
      u.status !== "active" ||
      u.session_version !== req.session.version
    )
      throw fail(401, "Session ถูกเพิกถอน");
    req.user = u;
    next();
  };
  app.use(
    "/api/v1",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (req, res) =>
        res.status(429).json({ error: "คำขอมากเกินไป กรุณารอสักครู่" }),
    }),
  );
  const permit =
    (...allowed) =>
    async (req, res, next) => {
      if (allowed.includes(req.user.role)) return next();
      if (repo.pool) {
        const [grants] = await repo.pool.execute(
          "SELECT role_code FROM user_grants WHERE user_id=? AND department_id IS NULL AND active=TRUE",
          [req.user.id],
        );
        if (grants.some((g) => allowed.includes(g.role_code))) return next();
      }
      await repo.event(req.user.id, "authorization.denied", null);
      next(fail(403, "ไม่มีสิทธิ์ทำรายการ"));
    };
  const recent = (req, res, next) =>
    clock() - (req.session.reauthAt || 0) <= 5 * 60 * 1000
      ? next()
      : next(fail(403, "ต้องยืนยันตัวตนซ้ำ"));
  app.get("/api/v1/health", (req, res) =>
    res.json({ status: "ok", environment: "TEST", scope: "P0/P1" }),
  );
  app.get("/api/v1/auth/google/start", (req, res) => {
    req.session.csrf ||= token();
    req.session.challenge = { nonce: token(), issuedAt: clock() };
    res.json({
      csrf: req.session.csrf,
      nonce: req.session.challenge.nonce,
      clientId: config.clientId,
      expiresAt: req.session.challenge.issuedAt + 300000,
    });
  });
  const loginLimit = rateLimit({
    windowMs: 60000,
    limit: 12,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ error: "กรุณารอสักครู่แล้วเข้าสู่ระบบใหม่" }),
  });
  app.post("/api/v1/auth/google/callback", loginLimit, async (req, res) => {
    const { credential, reauth } = z
      .object({
        credential: z.string().min(10).max(16000),
        reauth: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    const challenge = req.session.challenge;
    delete req.session.challenge;
    await save(req.session);
    if (!challenge) throw fail(401, "Challenge required");
    if (!(await repo.consumeNonce(challenge.nonce)))
      throw fail(401, "Challenge already consumed");
    let payload;
    try {
      payload = await verify(credential);
    } catch {
      await repo.event(null, "auth.invalid-token", null);
      throw fail(401, "Google token ไม่ถูกต้อง");
    }
    let identity;
    try {
      identity = validateIdentity(payload, {
        ...challenge,
        clientId: config.clientId,
        now: clock(),
      });
    } catch (e) {
      await repo.event(null, "auth.invalid-claims." + e.code, null);
      throw e;
    }
    if (reauth) {
      await new Promise((resolve, reject) =>
        authenticated(req, res, (e) => (e ? reject(e) : resolve())).catch(
          reject,
        ),
      );
      if (
        identity.sub !== req.session.sub ||
        payload.iat < Math.floor(challenge.issuedAt / 1000)
      )
        throw fail(401, "ต้องใช้ Google บัญชีเดิมและ Token ใหม่");
      req.session.reauthAt = clock();
      await repo.event(req.user.id, "auth.reauthenticate", req.user.id);
      await save(req.session);
      return res.json({ ok: true, csrf: req.session.csrf });
    }
    const u = await repo.login(identity);
    if (!u) {
      await repo.recordVerifiedRequest(identity);
      await repo.event(null, "auth.denied", null);
      throw fail(403, "บัญชีนี้ยังไม่ได้รับอนุมัติ กรุณาติดต่อผู้ดูแลระบบ");
    }
    await regenerate(req.session);
    Object.assign(req.session, {
      userId: u.id,
      sub: identity.sub,
      version: u.session_version,
      loginAt: clock(),
      csrf: token(),
    });
    await save(req.session);
    res.json({ ok: true, csrf: req.session.csrf });
  });
  app.get("/api/v1/auth/me", authenticated, (req, res) =>
    res.json({ id: req.user.id, email: req.user.email, role: req.user.role }),
  );
  app.post("/api/v1/auth/logout", async (req, res) => {
    if (req.session.userId)
      await repo.event(req.session.userId, "auth.logout", req.session.userId);
    await new Promise((resolve, reject) =>
      req.session.destroy((e) => (e ? reject(e) : resolve())),
    );
    res.clearCookie(config.secure ? "__Host-npc.sid" : "npc.test.sid", {
      path: "/",
      secure: config.secure,
      httpOnly: true,
      sameSite: "lax",
    });
    res.json({ ok: true });
  });
  app.get(
    "/api/v1/admin/users",
    authenticated,
    permit("system_admin"),
    async (req, res) => {
      const rows = await repo.users();
      await repo.event(req.user.id, "user.list", null);
      res.json(rows);
    },
  );
  app.post(
    "/api/v1/admin/users",
    authenticated,
    permit("system_admin"),
    recent,
    async (req, res) =>
      res
        .status(201)
        .json(await repo.createUser(req.user.id, userInput.parse(req.body))),
  );
  app.patch(
    "/api/v1/admin/users/:id",
    authenticated,
    permit("system_admin"),
    recent,
    async (req, res) => {
      const id = idInput.parse(req.params.id);
      if (id === req.user.id) throw fail(409, "ไม่อนุญาตให้แก้สิทธิ์ตนเอง");
      const data = z
        .object({
          role: roles,
          status: z.enum(["pending", "active", "suspended", "revoked"]),
        })
        .strict()
        .parse(req.body);
      if (!(await repo.updateUser(req.user.id, id, data)))
        throw fail(404, "ไม่พบบัญชี");
      res.json({ ok: true });
    },
  );
  app.post(
    "/api/v1/admin/users/:id/revoke",
    authenticated,
    permit("system_admin"),
    recent,
    async (req, res) => {
      const id = idInput.parse(req.params.id);
      if (!(await repo.revoke(req.user.id, id))) throw fail(404, "ไม่พบบัญชี");
      res.json({ ok: true });
    },
  );
  if (repo.pool)
    mountEnterprise(app, {
      repo,
      config,
      authenticated,
      root,
      storageOverride,
    });
  app.get("/api/v1/documents", authenticated, async (req, res) => {
    const rows = await repo.documents(req.user);
    await repo.event(req.user.id, "document.list", null);
    res.json(rows);
  });
  app.post(
    "/api/v1/documents",
    authenticated,
    permit("department_staff"),
    async (req, res) =>
      res
        .status(201)
        .json(await repo.createDocument(req.user.id, docInput.parse(req.body))),
  );
  for (const method of ["patch", "delete"])
    app[method](
      "/api/v1/documents/:id",
      authenticated,
      permit("system_admin", "department_staff"),
      async (req, res) => {
        const id = idInput.parse(req.params.id);
        const schema =
          method === "delete"
            ? z.object({ version: z.number().int().positive() }).strict()
            : docInput.extend({ version: z.number().int().positive() });
        const result = await repo.changeDocument(
          req.user,
          id,
          schema.parse(req.body),
          method === "delete",
        );
        if (result === "missing") {
          await repo.event(req.user.id, "document.access-denied", id);
          throw fail(404, "ไม่พบเอกสาร");
        }
        if (result === "conflict") throw fail(409, "เอกสารถูกแก้ไข กรุณาโหลดใหม่");
        res.json({ ok: true });
      },
    );
  app.use(
    "/vendor/jquery.js",
    express.static(root + "node_modules/jquery/dist/jquery.min.js"),
  );
  app.use(
    "/vendor/sweetalert2.js",
    express.static(
      root + "node_modules/sweetalert2/dist/sweetalert2.all.min.js",
    ),
  );
  app.use(
    "/vendor/sweetalert2.css",
    express.static(root + "node_modules/sweetalert2/dist/sweetalert2.min.css"),
  );
  app.use(
    "/vendor/datatables.js",
    express.static(root + "node_modules/datatables.net/js/dataTables.min.js"),
  );
  app.use(
    "/vendor/datatables.css",
    express.static(
      root + "node_modules/datatables.net-dt/css/dataTables.dataTables.min.css",
    ),
  );
  app.use(
    "/vendor/fonts",
    express.static(root + "node_modules/@fontsource/noto-sans-thai/files"),
  );
  app.use(express.static(root + "apps/web/public", { index: "index.html" }));
  app.use((req, res) => res.status(404).json({ error: "ไม่พบเส้นทาง" }));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status =
      err instanceof z.ZodError
        ? 400
        : err.code === "ER_DUP_ENTRY"
          ? 409
          : err.code === "LIMIT_FILE_SIZE"
            ? 413
            : err.name === "MulterError"
              ? 400
              : err.type === "entity.too.large"
                ? 413
                : err.type === "entity.parse.failed"
                  ? 400
                  : err.status || 500;
    res.status(status).json({
      error:
        status >= 500
          ? "ระบบไม่พร้อมใช้งาน"
          : status === 409
            ? "ข้อมูลซ้ำหรือมีการเปลี่ยนแปลง"
            : status === 400
              ? "ข้อมูลไม่ถูกต้อง"
              : err.message,
    });
  });
  return app;
}
