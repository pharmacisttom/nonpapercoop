import { test } from "node:test";
import assert from "node:assert/strict";
import { Repository } from "../../apps/api/src/repository.js";
import { MySQLSessionStore } from "../../apps/api/src/session-store.js";
test("SQL repository binds untrusted content and rolls back failed audit", async () => {
  let rolled = false,
    committed = false;
  const calls = [];
  const c = {
    beginTransaction: async () => {},
    commit: async () => {
      committed = true;
    },
    rollback: async () => {
      rolled = true;
    },
    release: () => {},
    execute: async (sql, args) => {
      calls.push({ sql, args });
      if (sql.startsWith("INSERT INTO audit"))
        throw new Error("audit unavailable");
      return [{ affectedRows: 1 }];
    },
  };
  const repo = new Repository({ getConnection: async () => c });
  const title = "'; DROP TABLE users; --";
  await assert.rejects(
    repo.createDocument("actor", { title, category: "general" }),
  );
  assert.equal(rolled, true);
  assert.equal(committed, false);
  assert.equal(calls[0].sql.includes(title), false);
  assert.equal(calls[0].args[1], title);
});
test("session store hashes session ID and uses bound parameters", async () => {
  const calls = [];
  const store = new MySQLSessionStore({
    execute: async (sql, args) => {
      calls.push({ sql, args });
      return [[]];
    },
  });
  await new Promise((resolve, reject) =>
    store.set(
      "raw-session-secret",
      { cookie: { expires: new Date(Date.now() + 60000) } },
      (e) => (e ? reject(e) : resolve()),
    ),
  );
  assert.equal(calls[0].args[0].length, 64);
  assert.ok(!JSON.stringify(calls).includes("raw-session-secret"));
});
