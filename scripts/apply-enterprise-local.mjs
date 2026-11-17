import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes, createCipheriv, createHash } from "node:crypto";
import mysql from "mysql2/promise";
if (!process.argv.includes("--apply-reviewed"))
  throw new Error(
    "Review additive migration003, then explicitly use --apply-reviewed",
  );
const secrets = JSON.parse(fs.readFileSync(".local/db-secrets.json", "utf8"));
const c = await mysql.createConnection({
  host: "127.0.0.1",
  port: 33307,
  user: "root",
  password: secrets.rootPassword,
  database: "nonpapercoop_test",
  multipleStatements: false,
});
try {
  const [identity] = await c.query(
    "SELECT @@port AS port,@@datadir AS datadir",
  );
  if (
    identity[0].port !== 33307 ||
    identity[0].datadir.replaceAll("\\", "/").toLowerCase() !==
      "d:/nopapercoop/.local/mariadb-test/"
  )
    throw new Error("Private TEST target mismatch");
  const [existing] = await c.execute(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('departments','document_controls','domain_events')",
    ["nonpapercoop_test"],
  );
  if (existing.length)
    throw new Error(
      "Enterprise migration already started; never rerun automatically",
    );
  const sql = fs
    .readFileSync("database/migrations/003_enterprise_modules.sql", "utf8")
    .replace(/^--.*$/gm, "");
  if (/\b(DROP|TRUNCATE|ALTER|DELETE)\b/i.test(sql))
    throw new Error("Non-additive statement refused");
  const configPath = "D:/nopapercoop/.local/enterprise-backup.cnf";
  fs.writeFileSync(
    configPath,
    `[client]\nhost=127.0.0.1\nport=33307\nuser=root\npassword=${secrets.rootPassword}\n`,
    { mode: 0o600 },
  );
  const dump = execFileSync(
    "C:\\xampp\\mysql\\bin\\mysqldump.exe",
    [
      `--defaults-file=${configPath}`,
      "--single-transaction",
      "--skip-lock-tables",
      "--skip-add-drop-table",
      "nonpapercoop_test",
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  const key = randomBytes(32),
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv),
    encrypted = Buffer.concat([cipher.update(dump), cipher.final()]);
  const backup = Buffer.concat([iv, cipher.getAuthTag(), encrypted]),
    name = ".local/pre-enterprise-" + Date.now();
  fs.writeFileSync(name + ".aesgcm", backup, { mode: 0o600 });
  fs.writeFileSync(name + ".key", key, { mode: 0o600 });
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await c.query(statement);
  const immutable = [
    "document_revisions",
    "workflow_actions",
    "signature_events",
    "domain_events",
    "meeting_votes",
  ];
  const mutable = [
    "departments",
    "user_grants",
    "document_controls",
    "document_acl",
    "document_files",
    "workflow_definitions",
    "workflow_instances",
    "workflow_tasks",
    "idempotency_keys",
    "sequence_counters",
    "document_registers",
    "document_distributions",
    "notifications",
    "legal_holds",
    "disposal_requests",
    "meetings",
    "meeting_agendas",
    "document_templates",
    "retention_policies",
  ];
  for (const table of immutable)
    await c.query(
      `GRANT SELECT,INSERT ON nonpapercoop_test.${table} TO 'nonpapercoop_test'@'127.0.0.1'`,
    );
  for (const table of mutable)
    await c.query(
      `GRANT SELECT,INSERT,UPDATE ON nonpapercoop_test.${table} TO 'nonpapercoop_test'@'127.0.0.1'`,
    );
  for (const table of ["department_memberships", "meeting_attendees"])
    await c.query(
      `GRANT SELECT,INSERT,UPDATE,DELETE ON nonpapercoop_test.${table} TO 'nonpapercoop_test'@'127.0.0.1'`,
    );
  await c.query(
    "GRANT SELECT,UPDATE ON nonpapercoop_test.domain_audit_head TO 'nonpapercoop_test'@'127.0.0.1'",
  );
  let env = fs.readFileSync(".env", "utf8");
  if (!/^STORAGE_KEY=/m.test(env)) {
    env += "\nSTORAGE_KEY=" + randomBytes(32).toString("base64") + "\n";
    fs.writeFileSync(".env", env, { mode: 0o600 });
  }
  const report = {
    status: "PASS",
    migration: "003_enterprise_modules.sql",
    sourcePort: 33307,
    backupSha256: createHash("sha256").update(backup).digest("hex"),
    backupEncrypted: true,
    destructiveStatements: false,
    productionTouched: false,
    rollback:
      "Restore prior app release; retain additive tables. For DB recovery restore encrypted pre-change backup to new isolated target, never overwrite source.",
  };
  fs.writeFileSync(
    "artifacts/enterprise-migration.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await c.end();
}
