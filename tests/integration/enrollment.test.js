import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { fixture, testConfig } from "../fixtures/app.js";
test("verified unknown Google identity creates only request, never user/session/role", async () => {
  const f = fixture(),
    agent = request.agent(f.app),
    count = f.repo.usersData.size;
  const b = (await agent.get("/api/v1/auth/google/start")).body.data;
  f.setPayload({ ...f.claims(b.nonce, "9999"), email: "new@example.invalid" });
  await agent
    .post("/api/v1/auth/google/callback")
    .set("Origin", testConfig.origin)
    .set("X-CSRF-Token", b.csrf)
    .send({ credential: "test-only-fake-token" })
    .expect(403);
  assert.equal(f.repo.usersData.size, count);
  assert.equal(
    f.repo.verifiedRequests.get("9999").email,
    "new@example.invalid",
  );
  await agent.get("/api/v1/auth/me").expect(401);
});
test("invalid Google claims never create enrollment evidence", async () => {
  const f = fixture(),
    agent = request.agent(f.app);
  const b = (await agent.get("/api/v1/auth/google/start")).body.data;
  f.setPayload({
    ...f.claims(b.nonce, "9999"),
    aud: "attacker.apps.googleusercontent.com",
  });
  await agent
    .post("/api/v1/auth/google/callback")
    .set("Origin", testConfig.origin)
    .set("X-CSRF-Token", b.csrf)
    .send({ credential: "test-only-fake-token" })
    .expect(401);
  assert.equal(f.repo.verifiedRequests.size, 0);
});
