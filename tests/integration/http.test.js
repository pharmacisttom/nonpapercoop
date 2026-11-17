import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { fixture, testConfig } from "../fixtures/app.js";
async function login(f, sub = "1002", agent = request.agent(f.app)) {
  const b = (await agent.get("/api/v1/auth/google/start")).body.data;
  f.setPayload(f.claims(b.nonce, sub));
  const r = await agent
    .post("/api/v1/auth/google/callback")
    .set("Origin", testConfig.origin)
    .set("X-CSRF-Token", b.csrf)
    .send({ credential: "fake-test-token" });
  return { agent, csrf: r.body.data?.csrf, response: r };
}
const send = (a, path, csrf, body, method = "post") =>
  a[method]("/api/v1" + path)
    .set("Origin", testConfig.origin)
    .set("X-CSRF-Token", csrf)
    .send(body);
test("anonymous denied; local authentication routes absent", async () => {
  const f = fixture();
  await request(f.app).get("/api/v1/auth/me").expect(401);
  for (const p of ["register", "password", "local-login", "reset-password"])
    await request(f.app)
      .get("/api/v1/auth/" + p)
      .expect(404);
});
test("login rotates session and logout revokes it", async () => {
  const f = fixture(),
    agent = request.agent(f.app);
  const b = await agent.get("/api/v1/auth/google/start");
  f.setPayload(f.claims(b.body.data.nonce));
  const r = await send(agent, "/auth/google/callback", b.body.data.csrf, {
    credential: "fake-test-token",
  });
  assert.equal(r.status, 200);
  assert.notEqual(
    b.headers["set-cookie"][0].split(";")[0],
    r.headers["set-cookie"][0].split(";")[0],
  );
  assert.match(r.headers["set-cookie"][0], /HttpOnly/);
  await agent.get("/api/v1/auth/me").expect(200);
  await send(agent, "/auth/logout", r.body.data.csrf, {}).expect(200);
  await agent.get("/api/v1/auth/me").expect(401);
});
test("unapproved Google user denied", async () => {
  assert.equal((await login(fixture(), "9999")).response.status, 403);
});
test("provider outage fails closed", async () => {
  const f = fixture(),
    a = request.agent(f.app);
  const b = (await a.get("/api/v1/auth/google/start")).body.data;
  f.setPayload(new Error("provider secret"));
  const r = await send(a, "/auth/google/callback", b.csrf, {
    credential: "fake-test-token",
  });
  assert.equal(r.status, 401);
  assert.ok(!r.text.includes("provider secret"));
});
test("CSRF and foreign origin denied", async () => {
  const f = fixture(),
    { agent, csrf } = await login(f);
  await agent.post("/api/v1/documents").send({}).expect(403);
  await agent
    .post("/api/v1/documents")
    .set("Origin", "https://evil.invalid")
    .set("X-CSRF-Token", csrf)
    .send({})
    .expect(403);
});
test("nonce mismatch and replay denied", async () => {
  const f = fixture(),
    a = request.agent(f.app);
  const b = (await a.get("/api/v1/auth/google/start")).body.data;
  f.setPayload(f.claims("bad"));
  await send(a, "/auth/google/callback", b.csrf, {
    credential: "fake-test-token",
  }).expect(401);
  f.setPayload(f.claims(b.nonce));
  await send(a, "/auth/google/callback", b.csrf, {
    credential: "fake-test-token",
  }).expect(401);
});
test("RBAC cannot bypass UI", async () => {
  const f = fixture(),
    { agent, csrf } = await login(f, "1004");
  await agent.get("/api/v1/admin/users").expect(403);
  await send(agent, "/documents", csrf, {
    title: "test",
    category: "general",
  }).expect(403);
});
test("document ownership, XSS as inert JSON, version conflict, deletion audited", async () => {
  const f = fixture(),
    a = await login(f),
    b = await login(f, "1003");
  const title = "<img src=x onerror=alert(1)>";
  const d = (
    await send(a.agent, "/documents", a.csrf, {
      title,
      category: "general",
    }).expect(201)
  ).body.data;
  assert.equal(d.title, title);
  const path = "/documents/" + d.id;
  await send(
    b.agent,
    path,
    b.csrf,
    { title: "stolen", category: "general", version: 1 },
    "patch",
  ).expect(404);
  assert.equal((await b.agent.get("/api/v1/documents")).body.data.length, 0);
  await send(
    a.agent,
    path,
    a.csrf,
    { title: "new", category: "general", version: 1 },
    "patch",
  ).expect(200);
  await send(a.agent, path, a.csrf, { version: 1 }, "delete").expect(409);
  await send(a.agent, path, a.csrf, { version: 2 }, "delete").expect(200);
  assert.equal(f.repo.events.at(-1).action, "document.delete");
});
test("admin has no implicit document read", async () => {
  const f = fixture(),
    maker = await login(f),
    admin = await login(f, "1001");
  await send(maker.agent, "/documents", maker.csrf, {
    title: "private",
    category: "member",
  }).expect(201);
  assert.equal(
    (await admin.agent.get("/api/v1/documents")).body.data.length,
    0,
  );
});
test("schema validation prevents mass assignment and malformed IDs", async () => {
  const f = fixture(),
    { agent, csrf } = await login(f);
  await send(agent, "/documents", csrf, {
    title: "x",
    category: "general",
    owner_id: "other",
  }).expect(400);
  await send(
    agent,
    "/documents/1' OR 1=1",
    csrf,
    { version: 1 },
    "delete",
  ).expect(400);
});
test("reauth required for allowlist; different identity denied", async () => {
  const f = fixture(),
    a = await login(f, "1001");
  await send(a.agent, "/admin/users", a.csrf, {
    email: "new@example.invalid",
    role: "department_staff",
    googleSub: "1005",
  }).expect(403);
  const b = (await a.agent.get("/api/v1/auth/google/start")).body.data;
  f.setPayload(f.claims(b.nonce, "1002"));
  await send(a.agent, "/auth/google/callback", b.csrf, {
    credential: "fake-test-token",
    reauth: true,
  }).expect(401);
});
test("admin reauth, allowlist and revocation invalidate existing sessions", async () => {
  const f = fixture(),
    admin = await login(f, "1001"),
    user = await login(f);
  const b = (await admin.agent.get("/api/v1/auth/google/start")).body.data;
  f.setPayload(f.claims(b.nonce, "1001"));
  await send(admin.agent, "/auth/google/callback", b.csrf, {
    credential: "fake-test-token",
    reauth: true,
  }).expect(200);
  const u = (await user.agent.get("/api/v1/auth/me")).body.data;
  await send(
    admin.agent,
    "/admin/users/" + u.id + "/revoke",
    admin.csrf,
    {},
  ).expect(200);
  await user.agent.get("/api/v1/auth/me").expect(401);
  await send(admin.agent, "/admin/users", admin.csrf, {
    email: "new@example.invalid",
    role: "department_staff",
    googleSub: "1005",
  }).expect(201);
});
test("absolute expiry enforced", async () => {
  const f = fixture(),
    a = await login(f);
  f.advance(8 * 3600000 + 1);
  await a.agent.get("/api/v1/auth/me").expect(401);
});
