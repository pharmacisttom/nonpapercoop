// Browser test harness: fictional identities and fake verifier. Not a runtime mode.
import session from "express-session";
import { createApp } from "../../apps/api/src/app.js";
import { TestRepository } from "./repository.js";
import { testConfig } from "./app.js";
import mysql from "mysql2/promise";
import { config } from "../../apps/api/src/config.js";
import { Repository } from "../../apps/api/src/repository.js";
import { Enterprise } from "../../apps/api/src/modules/enterprise.js";
import { documentSchema } from "../../apps/api/src/modules/schemas.js";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
let repo = new TestRepository(),
  pool;
if (process.env.E2E_ENTERPRISE === "true") {
  const c = config();
  if (c.db.port !== 33307) throw new Error("Private TEST instance required");
  pool = mysql.createPool(c.db);
  repo = new Repository(pool);
  const [existing] = await pool.execute(
    "SELECT u.* FROM users u JOIN google_identities g ON g.user_id=u.id WHERE g.google_sub=?",
    ["1002"],
  );
  let actor = existing[0];
  if (!actor)
    actor = await repo.createUser(null, {
      email: "ui.fixture@example.invalid",
      googleSub: "1002",
      role: "department_staff",
    });
  const service = new Enterprise(repo);
  const [oldXss] = await pool.execute(
    "SELECT id,version FROM documents WHERE owner_id=? AND title=? AND status='draft' AND deleted_at IS NULL",
    [actor.id, "<img src=x onerror=alert(1)>"],
  );
  for (const d of oldXss)
    await service.update(actor, d.id, null, d.version, true);
  const [docs] = await pool.execute(
    "SELECT id FROM documents WHERE owner_id=? AND deleted_at IS NULL",
    [actor.id],
  );
  if (!docs.length)
    for (const [title, description] of [
      [
        "บันทึกการประชุมฝ่ายปฏิบัติการ",
        "เอกสารสมมติสำหรับตรวจสอบรูปแบบและการแสดงผลภาษาไทย",
      ],
      ["แนวทางจัดเก็บเอกสารภายใน", "ตัวอย่างเอกสารสำหรับทดสอบประสบการณ์ใช้งาน"],
      ["แผนงานปรับปรุงบริการสมาชิก", "ใช้ตรวจ UI เท่านั้น ไม่มีข้อมูลสมาชิกจริง"],
    ])
      await service.create(
        actor,
        documentSchema.parse({ title, category: "general", description }),
      );
  const [checkers] = await pool.execute(
    "SELECT u.* FROM users u JOIN google_identities g ON g.user_id=u.id WHERE g.google_sub=?",
    ["1003"],
  );
  const checker =
    checkers[0] ||
    (await repo.createUser(null, {
      email: "ui.checker@example.invalid",
      googleSub: "1003",
      role: "department_head",
    }));
  const fixtures = {};
  for (const project of ["desktop", "mobile"]) {
    const doc = await service.create(
      actor,
      documentSchema.parse({
        title: "ทดสอบลงนามผ่านหน้าจอ " + project + " " + Date.now(),
        category: "general",
        description: "เอกสารสมมติผ่านผู้ตรวจสอบคนละคนแล้ว ใช้ทดสอบ UI ลงนามเท่านั้น",
      }),
    );
    const def = await service.definition(
      checker,
      {
        code: "UI_" + project + "_" + Date.now(),
        name: "UI signing fixture",
        version: 1,
        steps: [
          {
            name: "ตรวจสอบโดยคนละคน",
            mode: "all",
            assignees: [checker.id],
            dueHours: 1,
          },
        ],
      },
      { reauthAt: Date.now() },
    );
    await service.definition(checker, null, { reauthAt: Date.now() }, def.id);
    await service.submit(
      actor,
      doc.id,
      { version: doc.version, definitionId: def.id },
      randomUUID(),
    );
    const task = (await service.tasks(checker)).find(
      (t) => t.document_id === doc.id,
    );
    await service.decide(
      checker,
      task.id,
      {
        version: task.version,
        action: "approve",
        reason: "อนุมัติข้อมูลสมมติเพื่อ E2E",
      },
      { reauthAt: Date.now() },
      randomUUID(),
    );
    await pool.execute(
      "UPDATE workflow_definitions SET status='retired' WHERE id=?",
      [def.id],
    );
    fixtures[project] = { documentId: doc.id, title: doc.title };
  }
  fs.writeFileSync(
    ".local/e2e-signing-fixtures.json",
    JSON.stringify(fixtures),
  );
}
const app = createApp({
  config: testConfig,
  repo,
  store: new session.MemoryStore(),
  verify: async (token) => {
    const p = JSON.parse(token);
    if (process.env.E2E_ENTERPRISE === "true" && p.sub !== "1002")
      throw new Error("Only fixed fictional E2E subject allowed");
    return p;
  },
});
const server = app.listen(3199, "127.0.0.1", () =>
  console.log(
    "Mock-provider E2E harness on loopback:3199; enterprise=" + Boolean(pool),
  ),
);
process.on("SIGTERM", () =>
  server.close(async () => {
    if (pool) await pool.end();
    process.exit(0);
  }),
);
