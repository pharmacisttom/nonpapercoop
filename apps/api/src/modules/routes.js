import express from "express";
import multer from "multer";
import { z } from "zod";
import { Enterprise } from "./enterprise.js";
import { SecureStorage } from "./storage.js";
import {
  roleCodes,
  rolePermissions,
  hasPermission,
  requireAssurance,
  problem,
} from "./policy.js";
import {
  uuid,
  reason,
  expectedVersion,
  documentSchema,
  departmentSchema,
  grantSchema,
  workflowSchema,
  meetingSchema,
} from "./schemas.js";
const versionBody = z.object({ version: expectedVersion }).strict();
const category = z.enum([
  "general",
  "saraban",
  "board",
  "finance",
  "procurement",
  "member",
]);
export function mountEnterprise(
  app,
  { repo, config, authenticated, root, storageOverride },
) {
  const storage =
    storageOverride ||
    (config.storageKey
      ? new SecureStorage({
          root: config.storageRoot || root + ".local/secure-storage",
          key: config.storageKey,
        })
      : null);
  const service = new Enterprise(repo, { storage }),
    router = express.Router();
  router.use(authenticated);
  const id = (req) => uuid.parse(req.params.id),
    body = (req, schema) => schema.parse(req.body),
    idem = (req) => req.get("Idempotency-Key");
  const listSchema = z
    .object({
      q: z.string().max(200).default(""),
      category: category.or(z.literal("")).default(""),
      state: z
        .string()
        .regex(/^[a-z_]{0,40}$/)
        .default(""),
      folderId: uuid.or(z.literal("")).default(""),
      page: z.coerce.number().int().min(1).max(10000).default(1),
      pageSize: z.coerce.number().int().min(1).max(200).default(25),
    })
    .strict();
  router.get("/capabilities", async (req, res) => {
    const p = await service.principal(repo.pool, req.user);
    res.json({
      roles: p.grants,
      departments: p.departments,
      permissions: [
        ...new Set(p.grants.flatMap((g) => rolePermissions[g.role_code] || [])),
      ],
      storage: !!storage,
      scanner: "ClamAV loopback INSTREAM; fail-closed when unavailable",
      highAssuranceConfigured: false,
    });
  });
  router.get("/directory", async (req, res) => {
    const p = await service.principal(repo.pool, req.user);
    if (
      !hasPermission(p, "workflow:manage") &&
      !hasPermission(p, "org:manage") &&
      !hasPermission(p, "document:create") &&
      !hasPermission(p, "meeting:create")
    )
      throw problem(403, "ไม่มีสิทธิ์ดูรายชื่อ");
    const [users] = await repo.pool.query(
      "SELECT id,email,role FROM users WHERE status='active' ORDER BY email LIMIT 500",
    );
    res.json(users);
  });
  router.get("/organization", async (req, res) =>
    res.json(await service.organization(req.user)),
  );
  router.get("/departments", async (req, res) => {
    const [rows] = await repo.pool.query(
      "SELECT id,code,name FROM departments WHERE active=TRUE ORDER BY code",
    );
    res.json(rows);
  });
  router.post("/departments", async (req, res) =>
    res
      .status(201)
      .json(
        await service.department(
          req.user,
          body(req, departmentSchema),
          req.session,
        ),
      ),
  );
  router.patch("/departments/:id", async (req, res) => {
    const b = body(
      req,
      departmentSchema.extend({
        version: expectedVersion,
        active: z.boolean(),
      }),
    );
    res.json(
      await service.department(
        req.user,
        { code: b.code, name: b.name },
        req.session,
        id(req),
        b.version,
        b.active,
      ),
    );
  });
  router.post("/organization/memberships", async (req, res) =>
    res.json(
      await service.membership(
        req.user,
        body(
          req,
          z
            .object({ userId: uuid, departmentId: uuid, enabled: z.boolean() })
            .strict(),
        ),
        req.session,
      ),
    ),
  );
  router.post("/organization/grants", async (req, res) =>
    res
      .status(201)
      .json(await service.grant(req.user, body(req, grantSchema), req.session)),
  );
  router.delete("/organization/grants/:id", async (req, res) =>
    res.json(await service.revokeGrant(req.user, id(req), req.session)),
  );
  router.get("/organization/groups", async (req, res) =>
    res.json(await service.groups(req.user)),
  );
  router.post("/organization/groups", async (req, res) =>
    res
      .status(201)
      .json(
        await service.group(req.user, body(req, departmentSchema), req.session),
      ),
  );
  router.patch("/organization/groups/:id", async (req, res) => {
    const b = body(
      req,
      departmentSchema.extend({
        version: expectedVersion,
        active: z.boolean(),
      }),
    );
    res.json(await service.group(req.user, b, req.session, id(req), b.version));
  });
  router.post("/organization/group-memberships", async (req, res) =>
    res.json(
      await service.groupMember(
        req.user,
        body(
          req,
          z
            .object({ groupId: uuid, userId: uuid, enabled: z.boolean() })
            .strict(),
        ),
        req.session,
      ),
    ),
  );
  router.get("/repository/folders", async (req, res) =>
    res.json(await service.folders(req.user)),
  );
  router.post("/repository/folders", async (req, res) =>
    res.status(201).json(
      await service.folder(
        req.user,
        body(
          req,
          z
            .object({
              name: z.string().trim().min(1).max(150),
              parentId: uuid.nullable().default(null),
            })
            .strict(),
        ),
      ),
    ),
  );
  router.patch("/repository/folders/:id", async (req, res) => {
    const b = body(
      req,
      z
        .object({
          name: z.string().trim().min(1).max(150),
          parentId: uuid.nullable(),
          active: z.boolean(),
          version: expectedVersion,
        })
        .strict(),
    );
    res.json(await service.folder(req.user, b, id(req), b.version));
  });
  router.get("/roles", (req, res) =>
    res.json(
      roleCodes.map((code) => ({
        code,
        permissions: rolePermissions[code] || [],
      })),
    ),
  );
  router.get("/documents", async (req, res) =>
    res.json(await service.list(req.user, listSchema.parse(req.query))),
  );
  router.get("/repository/search", async (req, res) =>
    res.json(await service.list(req.user, listSchema.parse(req.query))),
  );
  router.post("/documents", async (req, res) =>
    res
      .status(201)
      .json(await service.create(req.user, body(req, documentSchema))),
  );
  router.get("/documents/:id", async (req, res) =>
    res.json(await service.get(req.user, id(req))),
  );
  router.patch("/documents/:id", async (req, res) => {
    const b = body(
      req,
      documentSchema.safeExtend({ version: expectedVersion }),
    );
    const { version, ...data } = b;
    res.json(await service.update(req.user, id(req), data, version));
  });
  router.delete("/documents/:id", async (req, res) =>
    res.json(
      await service.update(
        req.user,
        id(req),
        null,
        body(req, versionBody).version,
        true,
      ),
    ),
  );
  router.post("/documents/:id/acl", async (req, res) =>
    res.json(
      await service.share(
        req.user,
        id(req),
        body(
          req,
          z
            .object({
              userId: uuid,
              permission: z.enum(["read", "write", "manage"]),
            })
            .strict(),
        ),
        req.session,
      ),
    ),
  );
  router.post("/documents/:id/group-acl", async (req, res) =>
    res.json(
      await service.groupShare(
        req.user,
        id(req),
        body(
          req,
          z
            .object({ groupId: uuid, permission: z.enum(["read", "write"]) })
            .strict(),
        ),
        req.session,
      ),
    ),
  );
  router.post("/documents/:id/revoke-access", async (req, res) =>
    res.json(
      await service.unshare(
        req.user,
        id(req),
        body(
          req,
          z
            .object({
              userId: uuid.optional(),
              groupId: uuid.optional(),
              permission: z.enum(["read", "write", "manage"]),
            })
            .strict()
            .refine((d) => Boolean(d.userId) !== Boolean(d.groupId)),
        ),
        req.session,
      ),
    ),
  );
  router.post("/documents/:id/folder", async (req, res) =>
    res.json(
      await service.fileInFolder(
        req.user,
        id(req),
        body(req, z.object({ folderId: uuid, enabled: z.boolean() }).strict()),
      ),
    ),
  );
  router.get("/documents/:id/timeline", async (req, res) =>
    res.json(await service.timeline(req.user, id(req))),
  );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  }).single("file");
  router.post(
    "/documents/:id/files",
    async (req, res, next) => {
      const p = await service.principal(repo.pool, req.user);
      await service.read(repo.pool, p, id(req), "write");
      next();
    },
    upload,
    async (req, res) => {
      if (!req.file) throw problem(400, "กรุณาเลือกไฟล์");
      const version = expectedVersion.parse(
        Number(req.get("X-Document-Version")),
      );
      res
        .status(201)
        .json(await service.upload(req.user, id(req), req.file, version));
    },
  );
  router.get("/documents/:id/files/:fileId/download", async (req, res) => {
    const file = await service.download(
      req.user,
      id(req),
      uuid.parse(req.params.fileId),
    );
    res
      .set({
        "Content-Type": file.type,
        "Content-Disposition":
          "attachment; filename*=UTF-8''" + encodeURIComponent(file.name),
        "Cache-Control": "no-store",
        "Content-Security-Policy": "sandbox; default-src 'none'",
      })
      .send(file.bytes);
  });
  router.post("/documents/:id/files/:fileId/scan", async (req, res) =>
    res.json(
      await service.rescan(req.user, id(req), uuid.parse(req.params.fileId)),
    ),
  );
  router.get("/workflows/definitions", async (req, res) =>
    res.json(await service.definitions(req.user)),
  );
  router.post("/workflows/definitions", async (req, res) =>
    res
      .status(201)
      .json(
        await service.definition(
          req.user,
          body(req, workflowSchema),
          req.session,
        ),
      ),
  );
  router.post("/workflows/definitions/:id/publish", async (req, res) =>
    res.json(await service.definition(req.user, null, req.session, id(req))),
  );
  router.post("/documents/:id/submit", async (req, res) =>
    res.json(
      await service.submit(
        req.user,
        id(req),
        body(
          req,
          z.object({ version: expectedVersion, definitionId: uuid }).strict(),
        ),
        idem(req),
      ),
    ),
  );
  router.post("/documents/:id/cancel", async (req, res) => {
    const b = body(
      req,
      z.object({ version: expectedVersion, reason }).strict(),
    );
    res.json(await service.cancel(req.user, id(req), b.version, b.reason));
  });
  router.get("/tasks/my", async (req, res) =>
    res.json(await service.tasks(req.user)),
  );
  for (const action of ["approve", "reject", "return"])
    router.post("/tasks/:id/" + action, async (req, res) => {
      const b = body(
        req,
        z
          .object({
            version: expectedVersion,
            reason:
              action === "approve" ? z.string().max(1000).default("") : reason,
          })
          .strict(),
      );
      res.json(
        await service.decide(
          req.user,
          id(req),
          { ...b, action },
          req.session,
          idem(req),
        ),
      );
    });
  router.post("/tasks/:id/delegate", async (req, res) =>
    res.json(
      await service.delegate(
        req.user,
        id(req),
        body(
          req,
          z
            .object({ version: expectedVersion, assigneeId: uuid, reason })
            .strict(),
        ),
        req.session,
      ),
    ),
  );
  router.post("/documents/:id/signing/request", async (req, res) =>
    res.json(
      await service.requestSignature(
        req.user,
        id(req),
        body(req, versionBody),
        req.session,
        idem(req),
      ),
    ),
  );
  router.get("/documents/:id/signing/digest", async (req, res) =>
    res.json(await service.signingDigest(req.user, id(req))),
  );
  router.post("/documents/:id/signing/confirm", async (req, res) =>
    res.json(
      await service.sign(
        req.user,
        id(req),
        body(
          req,
          z
            .object({
              version: expectedVersion,
              digest: z.string().regex(/^[0-9a-f]{64}$/),
              intent: z.string().trim().min(5).max(500),
            })
            .strict(),
        ),
        req.session,
        idem(req),
      ),
    ),
  );
  router.get("/documents/:id/verify", async (req, res) =>
    res.json(await service.verify(req.user, id(req))),
  );
  router.get("/registries", async (req, res) =>
    res.json(await service.registries(req.user)),
  );
  router.post("/documents/:id/register", async (req, res) =>
    res.json(
      await service.register(
        req.user,
        id(req),
        body(
          req,
          z
            .object({
              version: expectedVersion,
              type: z.enum(["inbound", "outbound", "internal"]),
            })
            .strict(),
        ),
        req.session,
        idem(req),
      ),
    ),
  );
  router.post("/documents/:id/distribute", async (req, res) =>
    res.json(
      await service.distribute(
        req.user,
        id(req),
        body(
          req,
          z
            .object({
              version: expectedVersion,
              recipients: z
                .array(uuid)
                .min(1)
                .max(100)
                .refine((a) => new Set(a).size === a.length),
            })
            .strict(),
        ),
        req.session,
      ),
    ),
  );
  router.post("/documents/:id/acknowledge", async (req, res) =>
    res.json(await service.acknowledge(req.user, id(req))),
  );
  router.get("/retention/policies", async (req, res) =>
    res.json(await service.retentionPolicies(req.user)),
  );
  router.post("/retention/policies", async (req, res) =>
    res.status(201).json(
      await service.addRetention(
        req.user,
        body(
          req,
          z
            .object({
              code: z.string().regex(/^[A-Z0-9_-]{1,40}$/),
              title: z.string().min(1).max(150),
              years: z.number().int().min(1).max(100),
              legalBasis: reason,
            })
            .strict(),
        ),
        req.session,
      ),
    ),
  );
  router.post("/documents/:id/archive", async (req, res) =>
    res.json(
      await service.archive(
        req.user,
        id(req),
        body(
          req,
          z.object({ version: expectedVersion, policyId: uuid }).strict(),
        ),
        req.session,
      ),
    ),
  );
  router.post("/documents/:id/holds", async (req, res) =>
    res.json(
      await service.hold(
        req.user,
        id(req),
        body(
          req,
          z.object({ reason, holdId: uuid.nullable().default(null) }).strict(),
        ),
        req.session,
      ),
    ),
  );
  router.post("/documents/:id/disposal", async (req, res) =>
    res.json(
      await service.disposal(
        req.user,
        id(req),
        body(
          req,
          z
            .object({ reason, requestId: uuid.nullable().default(null) })
            .strict(),
        ),
        req.session,
      ),
    ),
  );
  router.get("/templates", async (req, res) =>
    res.json(await service.templates(req.user)),
  );
  router.post("/templates", async (req, res) =>
    res.status(201).json(
      await service.template(
        req.user,
        body(
          req,
          z
            .object({
              code: z.string().regex(/^[A-Z0-9_-]{1,40}$/),
              version: expectedVersion,
              title: z.string().min(1).max(200),
              body: z.string().min(1).max(10000),
              category,
            })
            .strict(),
        ),
        req.session,
      ),
    ),
  );
  router.post("/templates/:id/publish", async (req, res) =>
    res.json(await service.template(req.user, null, req.session, id(req))),
  );
  router.post("/templates/:id/documents", async (req, res) =>
    res
      .status(201)
      .json(
        await service.fromTemplate(
          req.user,
          id(req),
          body(req, documentSchema),
        ),
      ),
  );
  router.get("/meetings", async (req, res) =>
    res.json(await service.meetings(req.user)),
  );
  router.post("/meetings", async (req, res) =>
    res
      .status(201)
      .json(await service.meetingCreate(req.user, body(req, meetingSchema))),
  );
  router.get("/meetings/:id", async (req, res) =>
    res.json(await service.meetingDetail(req.user, id(req))),
  );
  router.patch("/meetings/:id", async (req, res) => {
    const b = body(req, meetingSchema.safeExtend({ version: expectedVersion }));
    const { version, ...data } = b;
    res.json(await service.meetingUpdate(req.user, id(req), data, version));
  });
  router.post("/meetings/:id/state", async (req, res) =>
    res.json(
      await service.meetingState(
        req.user,
        id(req),
        body(
          req,
          z
            .object({
              version: expectedVersion,
              state: z.enum(["open", "published", "cancelled"]),
              minutes: z.string().min(1).max(10000).optional(),
            })
            .strict()
            .refine((v) => v.state !== "published" || Boolean(v.minutes)),
        ),
        req.session,
      ),
    ),
  );
  router.post("/meetings/:id/agendas", async (req, res) =>
    res.status(201).json(
      await service.agenda(
        req.user,
        id(req),
        body(
          req,
          z
            .object({
              ordinal: z.number().int().min(1).max(500),
              title: z.string().min(1).max(200),
              documentId: uuid.nullable().default(null),
            })
            .strict(),
        ),
      ),
    ),
  );
  router.post("/meetings/:id/attendance", async (req, res) =>
    res.json(
      await service.attendance(
        req.user,
        id(req),
        body(
          req,
          z.object({ attended: z.boolean(), conflict: z.boolean() }).strict(),
        ),
      ),
    ),
  );
  router.post("/meetings/:id/agendas/:agendaId/vote", async (req, res) =>
    res.json(
      await service.vote(
        req.user,
        id(req),
        uuid.parse(req.params.agendaId),
        body(
          req,
          z.object({ vote: z.enum(["approve", "reject", "abstain"]) }).strict(),
        ).vote,
        req.session,
      ),
    ),
  );
  router.post("/meetings/:id/agendas/:agendaId/resolve", async (req, res) =>
    res.json(
      await service.resolve(
        req.user,
        id(req),
        uuid.parse(req.params.agendaId),
        body(req, z.object({ text: reason }).strict()).text,
        req.session,
      ),
    ),
  );
  router.get("/notifications", async (req, res) =>
    res.json(await service.notifications(req.user)),
  );
  router.post("/notifications/:id/read", async (req, res) =>
    res.json(await service.notifications(req.user, id(req))),
  );
  router.get("/reports/overview", async (req, res) =>
    res.json(await service.overview(req.user)),
  );
  router.get("/reports/export.csv", async (req, res) => {
    const list = await service.list(req.user, { pageSize: 200 });
    for (const r of list.items)
      if (
        r.classification === "confidential" ||
        ["finance", "member", "board", "procurement"].includes(r.category)
      )
        requireAssurance(r, req.session);
    const cell = (v) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@\-\t\r]/, "' $&")
        .replaceAll('"', '""') +
      '"';
    const csv = [
      ["ชื่อเอกสาร", "ประเภท", "สถานะ", "ชั้นความลับ", "รุ่น"],
      ...list.items.map((r) => [
        r.title,
        r.category,
        r.state,
        r.classification,
        r.version,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n");
    await repo.event(req.user.id, "report.export", null);
    res
      .set({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="nonpapercoop-test.csv"',
        "X-Export-Limit": "200",
      })
      .send("\uFEFF" + csv);
  });
  router.get("/admin/audit", async (req, res) =>
    res.json(await service.audit(req.user)),
  );
  app.use("/api/v1", router);
  return service;
}
