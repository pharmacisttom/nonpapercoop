import { test } from "node:test";
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { config } from "../apps/api/src/config.js";
import { Repository } from "../apps/api/src/repository.js";
import { MySQLSessionStore } from "../apps/api/src/session-store.js";
import { createApp } from "../apps/api/src/app.js";
import request from "supertest";
test(
  "Real SQL repository: identity uniqueness, concurrent version update, sessions and revoke",
  { skip: process.env.RUN_MYSQL_TESTS !== "true" },
  async () => {
    const c = config();
    const pool = mysql.createPool(c.db);
    const repo = new Repository(pool);
    try {
      const [version] = await pool.query("SELECT VERSION() AS version");
      console.log("Actual database engine:", version[0].version);
      if (process.env.ALLOW_MARIADB_COMPAT === "true")
        assert.match(version[0].version, /MariaDB/);
      else assert.match(version[0].version, /^8\./);
      const suffix = Date.now().toString();
      const user = await repo.createUser(null, {
        email: suffix + "@example.invalid",
        googleSub: suffix,
        role: "department_staff",
      });
      assert.equal((await repo.login({ sub: suffix })).id, user.id);
      await assert.rejects(
        repo.createUser(null, {
          email: suffix + "b@example.invalid",
          googleSub: suffix,
          role: "department_staff",
        }),
      );
      const doc = await repo.createDocument(user.id, {
        title: "TEST fixture " + suffix,
        category: "general",
      });
      const results = await Promise.all([
        repo.changeDocument({ id: user.id }, doc.id, {
          title: "a",
          category: "general",
          version: 1,
        }),
        repo.changeDocument({ id: user.id }, doc.id, {
          title: "b",
          category: "general",
          version: 1,
        }),
      ]);
      assert.deepEqual(results.sort(), ["conflict", "ok"]);
      let claims;
      const app = createApp({
        config: c,
        repo,
        store: new MySQLSessionStore(pool),
        verify: async () => claims,
      });
      const agent = request.agent(app),
        b = (await agent.get("/api/v1/auth/google/start")).body.data;
      claims = {
        sub: suffix,
        email: suffix + "@example.invalid",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: c.clientId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
        nonce: b.nonce,
      };
      const login = await agent
        .post("/api/v1/auth/google/callback")
        .set("Origin", c.origin)
        .set("X-CSRF-Token", b.csrf)
        .send({ credential: "test-real-db-mock-google" })
        .expect(200);
      await agent.get("/api/v1/auth/me").expect(200);
      await agent
        .post("/api/v1/documents")
        .set("Origin", c.origin)
        .set("X-CSRF-Token", login.body.data.csrf)
        .send({ title: "SQL HTTP fixture", category: "general" })
        .expect(201);
      await repo.revoke(user.id, user.id);
      await agent.get("/api/v1/auth/me").expect(401);
      await assert.rejects(
        pool.query("UPDATE audit_events SET action=? WHERE actor_id=?", [
          "tampered",
          user.id,
        ]),
        (e) => e.code === "ER_TABLEACCESS_DENIED_ERROR",
      );
    } finally {
      await pool.end();
    }
  },
);
