// Fresh, disposable CI MySQL8 only. No deployment/migration capability outside CI.
import fs from "node:fs";
import mysql from "mysql2/promise";
import { config } from "../apps/api/src/config.js";
if (process.env.CI !== "true")
  throw new Error("CI-only fresh schema initializer");
const cfg = config();
if (cfg.db.host !== "127.0.0.1" || cfg.db.port !== 33307)
  throw new Error("Isolated CI target required");
const c = await mysql.createConnection({
  ...cfg.db,
  user: "root",
  password: process.env.MYSQL_ROOT_PASSWORD,
});
try {
  const [version] = await c.query("SELECT VERSION() AS version");
  if (!/^8\./.test(version[0].version)) throw new Error("MySQL8 required");
  const [existing] = await c.query("SHOW TABLES");
  if (existing.length) throw new Error("CI database must be empty");
  for (const file of [
    "001_p0_p1.sql",
    "002_verified_access_requests.sql",
    "003_enterprise_modules.sql",
    "004_groups_folders.sql",
  ]) {
    const sql = fs
      .readFileSync("database/migrations/" + file, "utf8")
      .replace(/^--.*$/gm, "");
    for (const statement of sql
      .split(";")
      .map((v) => v.trim())
      .filter(Boolean))
      await c.query(statement);
  }
  await c.query(
    "REVOKE ALL PRIVILEGES ON nonpapercoop_test.* FROM 'nonpapercoop_test'@'%'",
  );
  const immutable = [
    "audit_events",
    "document_revisions",
    "workflow_actions",
    "signature_events",
    "domain_events",
    "meeting_votes",
  ];
  const deletable = [
    "sessions",
    "document_acl",
    "department_memberships",
    "meeting_attendees",
    "group_memberships",
    "document_group_acl",
    "document_folders",
  ];
  const [rows] = await c.query("SHOW TABLES");
  for (const row of rows) {
    const table = Object.values(row)[0];
    if (!/^[a-z_]+$/.test(table)) throw new Error("Unexpected table");
    const permissions = immutable.includes(table)
      ? "SELECT,INSERT"
      : table === "domain_audit_head"
        ? "SELECT,UPDATE"
        : deletable.includes(table)
          ? "SELECT,INSERT,UPDATE,DELETE"
          : "SELECT,INSERT,UPDATE";
    await c.query(
      `GRANT ${permissions} ON nonpapercoop_test.${table} TO 'nonpapercoop_test'@'%'`,
    );
  }
  console.log(
    "Fresh CI MySQL8 schema initialized with least-privilege runtime grants",
  );
} finally {
  await c.end();
}
