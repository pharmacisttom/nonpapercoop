// Additive bootstrap ONLY for the new private local TEST instance initialized by local-db-init.
import fs from "node:fs";
import mysql from "mysql2/promise";
const secrets = JSON.parse(fs.readFileSync(".local/db-secrets.json", "utf8"));
const admin = await mysql.createConnection({
  host: "127.0.0.1",
  port: 33307,
  user: "root",
  password: secrets.rootPassword,
  multipleStatements: false,
});
try {
  const [identity] = await admin.query(
    "SELECT @@port AS port, @@datadir AS datadir, VERSION() AS version",
  );
  if (
    identity[0].port !== 33307 ||
    identity[0].datadir.replaceAll("\\", "/").toLowerCase() !==
      "d:/nopapercoop/.local/mariadb-test/"
  )
    throw new Error("Private TEST instance mismatch");
  const [exists] = await admin.execute(
    "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME=?",
    ["nonpapercoop_test"],
  );
  let resume = false;
  if (exists.length) {
    if (!process.argv.includes("--resume-users-only"))
      throw new Error("TEST database exists; refuse automatic migration rerun");
    const [tables] = await admin.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=?",
      ["nonpapercoop_test"],
    );
    if (tables.length !== 1 || tables[0].TABLE_NAME !== "users")
      throw new Error("Unexpected partial schema; stop for review");
    const [rows] = await admin.query(
      "SELECT COUNT(*) AS n FROM nonpapercoop_test.users",
    );
    if (rows[0].n !== 0) throw new Error("Partial schema contains data");
    await admin.query(
      "ALTER TABLE nonpapercoop_test.users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
    resume = true;
  } else
    await admin.query(
      "CREATE DATABASE nonpapercoop_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
  await admin.changeUser({ database: "nonpapercoop_test" });
  const migration = fs
    .readFileSync("database/migrations/001_p0_p1.sql", "utf8")
    .replace(/^--.*$/gm, "");
  // Static reviewed migration only; no user-provided SQL or destructive statements.
  for (const statement of migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (resume && statement.startsWith("CREATE TABLE users")) continue;
    await admin.query(statement);
  }
  await admin.query(
    "CREATE USER 'nonpapercoop_test'@'127.0.0.1' IDENTIFIED BY ?",
    [secrets.appPassword],
  );
  for (const table of [
    "users",
    "google_identities",
    "documents",
    "auth_nonces",
  ])
    await admin.query(
      `GRANT SELECT, INSERT, UPDATE ON nonpapercoop_test.${table} TO 'nonpapercoop_test'@'127.0.0.1'`,
    );
  await admin.query(
    "GRANT SELECT, INSERT ON nonpapercoop_test.audit_events TO 'nonpapercoop_test'@'127.0.0.1'",
  );
  await admin.query(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON nonpapercoop_test.sessions TO 'nonpapercoop_test'@'127.0.0.1'",
  );
  console.log("Isolated TEST additive schema created:", identity[0]);
} finally {
  await admin.end();
}
