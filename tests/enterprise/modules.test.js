import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import mysql from "mysql2/promise";
import { config } from "../../apps/api/src/config.js";
import { Repository } from "../../apps/api/src/repository.js";
import { Enterprise } from "../../apps/api/src/modules/enterprise.js";
import { SecureStorage } from "../../apps/api/src/modules/storage.js";
import { documentSchema } from "../../apps/api/src/modules/schemas.js";
import { createApp } from "../../apps/api/src/app.js";
import { MySQLSessionStore } from "../../apps/api/src/session-store.js";
import request from "supertest";
import { notifyOverdue } from "../../apps/api/src/modules/deadlines.js";
let pool,
  repo,
  service,
  users,
  storage,
  c,
  now = Date.now();
const session = () => ({ reauthAt: now });
const input = (title, extra = {}) =>
  documentSchema.parse({ title, category: "general", ...extra });
const key = () => randomUUID();
before(async () => {
  c = config();
  if (c.db.port !== 33307)
    throw new Error("Enterprise local suite requires private TEST port33307");
  pool = mysql.createPool(c.db);
  repo = new Repository(pool);
  storage = new SecureStorage({
    root: ".local/enterprise-tests/" + randomUUID(),
    key: randomBytes(32).toString("base64"),
    scan: async (b) =>
      b.includes(Buffer.from("EICAR")) ? "infected" : "clean",
  });
  service = new Enterprise(repo, { storage, clock: () => now });
  users = {};
  let n = 0;
  for (const [name, role] of Object.entries({
    admin: "system_admin",
    maker: "department_staff",
    other: "department_staff",
    checker: "department_head",
    checker2: "manager",
    records: "records_officer",
    records2: "records_officer",
    chair: "chairperson",
    auditor: "auditor_readonly",
  })) {
    const sub = Date.now().toString() + String(++n).padStart(4, "0");
    users[name] = await repo.createUser(null, {
      email: sub + "@example.invalid",
      googleSub: sub,
      role,
    });
  }
});
after(async () => {
  if (pool) {
    if (users)
      for (const u of Object.values(users)) {
        await repo.updateUser(null, u.id, { role: u.role, status: "revoked" });
        await pool.execute(
          "UPDATE workflow_definitions SET status='retired' WHERE created_by=?",
          [u.id],
        );
      }
    await pool.end();
  }
});
async function approved(title = "approved fixture", options = {}) {
  const d = await service.create(users.maker, input(title, options));
  const def = await service.definition(
    users.checker,
    {
      code: "T" + Date.now() + Math.floor(Math.random() * 10000),
      name: "TEST sequential",
      version: 1,
      steps: [
        {
          name: "check",
          mode: "all",
          assignees: [users.checker.id],
          dueHours: 1,
        },
      ],
    },
    session(),
  );
  await service.definition(users.checker, null, session(), def.id);
  await service.submit(
    users.maker,
    d.id,
    { version: 1, definitionId: def.id },
    key(),
  );
  const task = (await service.tasks(users.checker)).find(
    (t) => t.document_id === d.id,
  );
  await service.decide(
    users.checker,
    task.id,
    { version: 1, action: "approve", reason: "checked" },
    session(),
    key(),
  );
  return service.get(users.maker, d.id);
}
test("ABAC: department internal, restricted ACL, administrator not implicit reader, SQL injection search", async () => {
  const dep = await service.department(
    users.admin,
    { code: "T" + Date.now(), name: "ฝ่ายทดสอบ" },
    session(),
  );
  for (const u of [users.maker, users.other])
    await service.membership(
      users.admin,
      { userId: u.id, departmentId: dep.id, enabled: true },
      session(),
    );
  const d = await service.create(
    users.maker,
    input("ฝ่ายเดียวกัน", { departmentId: dep.id }),
  );
  assert.equal((await service.get(users.other, d.id)).id, d.id);
  await assert.rejects(service.get(users.admin, d.id), (e) => e.status === 404);
  const r = await service.create(
    users.maker,
    input("restricted", { departmentId: dep.id, classification: "restricted" }),
  );
  await assert.rejects(service.get(users.other, r.id), (e) => e.status === 404);
  await service.share(
    users.maker,
    r.id,
    { userId: users.other.id, permission: "read" },
    session(),
  );
  assert.equal((await service.get(users.other, r.id)).id, r.id);
  await assert.rejects(
    service.update(users.other, r.id, input("stolen"), 1),
    (e) => e.status === 404,
  );
  assert.equal(
    (await service.list(users.other, { q: "%' OR 1=1 --" })).total,
    0,
  );
});
test("encrypted files: magic bytes, quarantine, IDOR, tamper detection, immutable revisions", async () => {
  const d = await service.create(users.maker, input("files"));
  await assert.rejects(
    service.upload(
      users.maker,
      d.id,
      {
        originalname: "evil.pdf",
        mimetype: "application/pdf",
        buffer: Buffer.from("<script>x</script>"),
      },
      1,
    ),
    (e) => e.status === 400,
  );
  const f = await service.upload(
    users.maker,
    d.id,
    {
      originalname: "สมมติ.txt",
      mimetype: "text/plain",
      buffer: Buffer.from("fictional data"),
    },
    1,
  );
  assert.equal(f.scanStatus, "clean");
  const read = await service.download(users.maker, d.id, f.id);
  assert.equal(read.bytes.toString(), "fictional data");
  await assert.rejects(
    service.download(users.other, d.id, f.id),
    (e) => e.status === 404,
  );
  const [files] = await pool.execute(
    "SELECT object_key FROM document_files WHERE id=?",
    [f.id],
  );
  const path = storage.root + "/" + files[0].object_key,
    raw = await fs.readFile(path),
    bad = Buffer.from(raw);
  bad[bad.length - 1] ^= 1;
  await fs.writeFile(path, bad);
  await assert.rejects(
    service.download(users.maker, d.id, f.id),
    (e) => e.status === 409,
  );
  await fs.writeFile(path, raw);
  const infected = await service.upload(
    users.maker,
    d.id,
    {
      originalname: "eicar.txt",
      mimetype: "text/plain",
      buffer: Buffer.from("EICAR harmless scanner test marker"),
    },
    2,
  );
  assert.equal(infected.scanStatus, "infected");
  await assert.rejects(
    service.download(users.maker, d.id, infected.id),
    (e) => e.status === 409,
  );
  await assert.rejects(
    pool.execute("UPDATE document_revisions SET sha256=? WHERE document_id=?", [
      "0".repeat(64),
      d.id,
    ]),
    (e) => e.code === "ER_TABLEACCESS_DENIED_ERROR",
  );
  const isolated = new Enterprise(repo, {
    storage: new SecureStorage({
      root: storage.root,
      key: storage.key.toString("base64"),
      scan: async () => "unavailable",
    }),
  });
  const q = await service.create(users.maker, input("quarantine"));
  const qf = await isolated.upload(
    users.maker,
    q.id,
    {
      originalname: "test.txt",
      mimetype: "text/plain",
      buffer: Buffer.from("clean but scanner unavailable"),
    },
    1,
  );
  assert.equal(qf.scanStatus, "quarantined");
  await assert.rejects(
    isolated.download(users.maker, q.id, qf.id),
    (e) => e.status === 409,
  );
});
test("workflow: self approval forbidden, sequential/parallel steps, replay and duplicate races", async () => {
  const d = await service.create(users.maker, input("parallel"));
  const def = await service.definition(
    users.checker,
    {
      code: "P" + Date.now(),
      name: "parallel then serial",
      version: 1,
      steps: [
        {
          name: "parallel",
          mode: "all",
          assignees: [users.checker.id, users.checker2.id],
          dueHours: 1,
        },
        {
          name: "second",
          mode: "any",
          assignees: [users.records.id, users.records2.id],
          dueHours: 1,
        },
      ],
    },
    session(),
  );
  await service.definition(users.checker, null, session(), def.id);
  const submitKey = key(),
    submission = { version: 1, definitionId: def.id };
  assert.deepEqual(
    await service.submit(users.maker, d.id, submission, submitKey),
    await service.submit(users.maker, d.id, submission, submitKey),
  );
  const a = (await service.tasks(users.checker)).find(
      (t) => t.document_id === d.id,
    ),
    b = (await service.tasks(users.checker2)).find(
      (t) => t.document_id === d.id,
    );
  await assert.rejects(
    service.decide(
      users.maker,
      a.id,
      { version: 1, action: "approve", reason: "" },
      session(),
      key(),
    ),
    (e) => e.status === 403,
  );
  const actionKey = key(),
    action = { version: 1, action: "approve", reason: "ok" };
  assert.deepEqual(
    await service.decide(users.checker, a.id, action, session(), actionKey),
    await service.decide(users.checker, a.id, action, session(), actionKey),
  );
  assert.equal((await service.get(users.maker, d.id)).state, "in_review");
  await service.decide(users.checker2, b.id, action, session(), key());
  const a2 = (await service.tasks(users.records)).find(
      (t) => t.document_id === d.id,
    ),
    b2 = (await service.tasks(users.records2)).find(
      (t) => t.document_id === d.id,
    );
  const races = await Promise.allSettled([
    service.decide(users.records, a2.id, action, session(), key()),
    service.decide(users.records2, b2.id, action, session(), key()),
  ]);
  assert.equal(races.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await service.get(users.maker, d.id)).state, "approved");
});
test("returned draft becomes new immutable revision; delegation cannot target maker", async () => {
  const d = await service.create(users.maker, input("return"));
  const def = await service.definition(
    users.checker,
    {
      code: "R" + Date.now(),
      name: "return test",
      version: 1,
      steps: [
        {
          name: "review",
          mode: "all",
          assignees: [users.checker.id],
          dueHours: 1,
        },
      ],
    },
    session(),
  );
  await service.definition(users.checker, null, session(), def.id);
  await service.submit(
    users.maker,
    d.id,
    { version: 1, definitionId: def.id },
    key(),
  );
  const task = (await service.tasks(users.checker)).find(
    (t) => t.document_id === d.id,
  );
  await assert.rejects(
    service.delegate(
      users.checker,
      task.id,
      { version: 1, assigneeId: users.maker.id, reason: "not allowed" },
      session(),
    ),
    (e) => e.status === 409,
  );
  await service.decide(
    users.checker,
    task.id,
    { version: 1, action: "return", reason: "แก้ไขข้อมูล" },
    session(),
    key(),
  );
  const r = await service.get(users.maker, d.id);
  const updated = await service.update(
    users.maker,
    d.id,
    input("revised"),
    r.version,
  );
  assert.equal(updated.state, "draft");
  assert.equal(updated.current_revision, 2);
});
test("signature digest, registry idempotency, distribution, retention and legal hold", async () => {
  const d = await approved("signed lifecycle");
  const hash = await service.requestSignature(
    users.maker,
    d.id,
    { version: d.version },
    session(),
    key(),
  );
  await assert.rejects(
    service.sign(
      users.maker,
      d.id,
      { version: hash.version, digest: "0".repeat(64), intent: "ยืนยันลงนาม" },
      session(),
      key(),
    ),
    (e) => e.status === 409,
  );
  await service.sign(
    users.maker,
    d.id,
    { version: hash.version, digest: hash.sha256, intent: "ยืนยันลงนามข้อมูลสมมติ" },
    session(),
    key(),
  );
  assert.equal((await service.verify(users.maker, d.id)).integrityValid, true);
  const signed = await service.get(users.maker, d.id);
  await assert.rejects(
    service.update(users.maker, d.id, input("tamper"), signed.version),
    (e) => e.status === 409,
  );
  await service.share(
    users.maker,
    d.id,
    { userId: users.records.id, permission: "read" },
    session(),
  );
  const regKey = key(),
    regData = { version: signed.version, type: "internal" };
  const reg = await service.register(
    users.records,
    d.id,
    regData,
    session(),
    regKey,
  );
  assert.deepEqual(
    await service.register(users.records, d.id, regData, session(), regKey),
    reg,
  );
  await assert.rejects(
    service.register(
      users.records,
      d.id,
      { ...regData, type: "outbound" },
      session(),
      regKey,
    ),
    (e) => e.status === 409,
  );
  const registered = await service.get(users.maker, d.id);
  await service.distribute(
    users.maker,
    d.id,
    { version: registered.version, recipients: [users.other.id] },
    session(),
  );
  await service.acknowledge(users.other, d.id);
  const policy = await service.addRetention(
    users.records,
    {
      code: "RET" + Date.now(),
      title: "Fictional one-year policy",
      years: 1,
      legalBasis: "ทดสอบ ไม่ใช่นโยบายจริง",
    },
    session(),
  );
  const distributed = await service.get(users.records, d.id);
  await service.archive(
    users.records,
    d.id,
    { version: distributed.version, policyId: policy.id },
    session(),
  );
  const hold = await service.hold(
    users.records,
    d.id,
    { reason: "ทดสอบ Legal Hold" },
    session(),
  );
  now += 2 * 366 * 24 * 3600000;
  await assert.rejects(
    service.disposal(
      users.records,
      d.id,
      { reason: "test disposal" },
      session(),
    ),
    (e) => e.status === 409,
  );
  await service.hold(
    users.records,
    d.id,
    { reason: "ปลด hold ทดสอบ", holdId: hold.id },
    session(),
  );
  const request = await service.disposal(
    users.records,
    d.id,
    { reason: "ครบกำหนดทดสอบ" },
    session(),
  );
  await assert.rejects(
    service.disposal(
      users.records,
      d.id,
      { reason: "self review forbidden", requestId: request.id },
      session(),
    ),
    (e) => e.status === 403,
  );
  now = Date.now();
});
test("high-risk approval is blocked when provider-attested assurance is unavailable", async () => {
  const d = await service.create(
    users.maker,
    input("finance", {
      category: "finance",
      classification: "restricted",
      domain: { amount: 100, currency: "THB" },
    }),
  );
  const def = await service.definition(
    users.checker,
    {
      code: "H" + Date.now(),
      name: "high risk",
      version: 1,
      steps: [
        {
          name: "review",
          mode: "all",
          assignees: [users.checker.id],
          dueHours: 1,
        },
      ],
    },
    session(),
  );
  await service.definition(users.checker, null, session(), def.id);
  await service.submit(
    users.maker,
    d.id,
    { version: 1, definitionId: def.id },
    key(),
  );
  const task = (await service.tasks(users.checker)).find(
    (t) => t.document_id === d.id,
  );
  await assert.rejects(
    service.decide(
      users.checker,
      task.id,
      { version: 1, action: "approve", reason: "test" },
      session(),
      key(),
    ),
    (e) => e.status === 403,
  );
});
test("meetings: explicit quorum/rule, confidentiality, attendance conflict and duplicate vote", async () => {
  const m = await service.meetingCreate(users.chair, {
    title: "Fictional meeting",
    startsAt: new Date(now + 3600000).toISOString(),
    location: "TEST",
    quorum: 2,
    votingRule: "majority_of_eligible",
    attendees: [users.chair.id, users.checker.id],
  });
  await assert.rejects(
    service.meetingDetail(users.admin, m.id),
    (e) => e.status === 404,
  );
  const a = await service.agenda(users.chair, m.id, {
    ordinal: 1,
    title: "วาระสมมติ",
    documentId: null,
  });
  const detail = await service.meetingDetail(users.chair, m.id);
  await service.meetingState(
    users.chair,
    m.id,
    { version: detail.version, state: "open" },
    session(),
  );
  await service.attendance(users.chair, m.id, {
    attended: true,
    conflict: false,
  });
  await service.attendance(users.checker, m.id, {
    attended: true,
    conflict: true,
  });
  await assert.rejects(
    service.vote(users.checker, m.id, a.id, "approve", session()),
    (e) => e.status === 403,
  );
  await assert.rejects(
    service.resolve(users.chair, m.id, a.id, "มติทดสอบ", session()),
    (e) => e.status === 409,
  );
  await service.attendance(users.checker, m.id, {
    attended: true,
    conflict: false,
  });
  await service.vote(users.chair, m.id, a.id, "approve", session());
  await service.vote(users.checker, m.id, a.id, "approve", session());
  await assert.rejects(
    service.vote(users.checker, m.id, a.id, "reject", session()),
    (e) => e.code === "ER_DUP_ENTRY",
  );
  assert.equal(
    (await service.resolve(users.chair, m.id, a.id, "อนุมัติสมมติ", session()))
      .passed,
    true,
  );
});
test("real HTTP enterprise endpoints: owner filtering, CSRF, uploads and grant revocation", async () => {
  let claims;
  const app = createApp({
    config: c,
    repo,
    store: new MySQLSessionStore(pool),
    verify: async () => claims,
    storageOverride: storage,
  });
  const a = request.agent(app);
  const [mapping] = await pool.execute(
    "SELECT google_sub FROM google_identities WHERE user_id=?",
    [users.other.id],
  );
  const b = (await a.get("/api/v1/auth/google/start")).body.data;
  claims = {
    sub: mapping[0].google_sub,
    email: users.other.email,
    email_verified: true,
    iss: "https://accounts.google.com",
    aud: c.clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
    nonce: b.nonce,
  };
  const login = await a
    .post("/api/v1/auth/google/callback")
    .set("Origin", c.origin)
    .set("X-CSRF-Token", b.csrf)
    .send({ credential: "mock-google-real-sql-test" })
    .expect(200);
  const csrf = login.body.data.csrf;
  const created = await a
    .post("/api/v1/documents")
    .set("Origin", c.origin)
    .set("X-CSRF-Token", csrf)
    .send({ title: "HTTP enterprise", category: "general" })
    .expect(201);
  const id = created.body.data.id;
  await a
    .post("/api/v1/documents/" + id + "/files")
    .set("Origin", c.origin)
    .set("X-CSRF-Token", csrf)
    .set("X-Document-Version", "1")
    .attach("file", Buffer.from("safe test text"), {
      filename: "test.txt",
      contentType: "text/plain",
    })
    .expect(201);
  const list = await a.get("/api/v1/documents?pageSize=1").expect(200);
  assert.equal(list.body.data.items.length, 1);
  await a
    .post("/api/v1/departments")
    .set("Origin", c.origin)
    .set("X-CSRF-Token", csrf)
    .send({ code: "BAD", name: "no role" })
    .expect(403);
  await repo.revoke(users.admin.id, users.other.id);
  await a.get("/api/v1/capabilities").expect(401);
});
test("domain audit chain validates and immutable events cannot be edited by app account", async () => {
  const audit = await service.audit(users.admin);
  assert.equal(audit.chainValid, true);
  await assert.rejects(
    pool.query(
      "UPDATE domain_events SET action='tampered' WHERE sequence_no=1",
    ),
    (e) => e.code === "ER_TABLEACCESS_DENIED_ERROR",
  );
});
test("group ACL revocation and hierarchical private folders enforce access without leaking documents", async () => {
  const g = await service.group(
    users.admin,
    { code: "G" + Date.now(), name: "กลุ่มทดสอบ" },
    session(),
  );
  await service.groupMember(
    users.admin,
    { groupId: g.id, userId: users.other.id, enabled: true },
    session(),
  );
  const d = await service.create(
    users.maker,
    input("group-only", { classification: "restricted" }),
  );
  await service.groupShare(
    users.maker,
    d.id,
    { groupId: g.id, permission: "read" },
    session(),
  );
  assert.equal((await service.get(users.other, d.id)).id, d.id);
  assert.ok((await service.list(users.other)).items.some((x) => x.id === d.id));
  const folder = await service.folder(users.other, {
    name: "โฟลเดอร์ทดสอบ",
    parentId: null,
  });
  await service.fileInFolder(users.other, d.id, {
    folderId: folder.id,
    enabled: true,
  });
  assert.equal(
    (await service.list(users.other, { folderId: folder.id })).total,
    1,
  );
  assert.equal(
    (await service.folders(users.maker)).some((f) => f.id === folder.id),
    false,
  );
  await assert.rejects(
    service.folder(
      users.maker,
      { name: "stolen", parentId: null, active: true },
      folder.id,
      1,
    ),
    (e) => e.status === 409,
  );
  await assert.rejects(
    service.folder(
      users.other,
      { name: "cycle", parentId: folder.id, active: true },
      folder.id,
      1,
    ),
    (e) => e.status === 400,
  );
  await service.groupMember(
    users.admin,
    { groupId: g.id, userId: users.other.id, enabled: false },
    session(),
  );
  await assert.rejects(service.get(users.other, d.id), (e) => e.status === 404);
  assert.equal(
    (await service.list(users.other, { folderId: folder.id })).total,
    0,
  );
});
test("concurrent registry assignments across different actors issue unique numbers", async () => {
  const records = [];
  for (let i = 0; i < 2; i++) {
    const d = await approved("number race " + i),
      digest = await service.requestSignature(
        users.maker,
        d.id,
        { version: d.version },
        session(),
        key(),
      );
    await service.sign(
      users.maker,
      d.id,
      {
        version: digest.version,
        digest: digest.sha256,
        intent: "ลงนามทดสอบเลขทะเบียน",
      },
      session(),
      key(),
    );
    const signed = await service.get(users.maker, d.id),
      officer = i ? users.records2 : users.records;
    await service.share(
      users.maker,
      d.id,
      { userId: officer.id, permission: "read" },
      session(),
    );
    records.push({ id: d.id, version: signed.version, officer });
  }
  const results = await Promise.all(
    records.map((d) =>
      service.register(
        d.officer,
        d.id,
        { version: d.version, type: "outbound" },
        session(),
        key(),
      ),
    ),
  );
  assert.notEqual(results[0].number, results[1].number);
});
test("deadline escalation notifies in-app without duplicate notifications or auto approval", async () => {
  const d = await service.create(users.maker, input("deadline")),
    def = await service.definition(
      users.checker,
      {
        code: "D" + Date.now(),
        name: "deadline test",
        version: 1,
        steps: [
          {
            name: "review",
            mode: "all",
            assignees: [users.checker.id],
            dueHours: 1,
          },
        ],
      },
      session(),
    );
  await service.definition(users.checker, null, session(), def.id);
  await service.submit(
    users.maker,
    d.id,
    { version: 1, definitionId: def.id },
    key(),
  );
  const task = (await service.tasks(users.checker)).find(
    (t) => t.document_id === d.id,
  );
  await pool.execute("UPDATE workflow_tasks SET due_at=? WHERE id=?", [
    new Date(Date.now() - 1000),
    task.id,
  ]);
  assert.ok((await notifyOverdue(repo)).emitted >= 1);
  assert.equal((await notifyOverdue(repo)).emitted, 0);
  assert.equal((await service.get(users.maker, d.id)).state, "in_review");
  assert.ok(
    (await service.notifications(users.maker)).some(
      (n) =>
        n.document_id === d.id && n.event_type.startsWith("workflow.overdue."),
    ),
  );
});
