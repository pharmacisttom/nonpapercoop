// Controlled TEST-only exercise: source and restore ports/datadirs are fixed and checked.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import mysql from "mysql2/promise";
const started = Date.now(),
  workspace = path.resolve(".");
if (workspace !== "D:\\nopapercoop") throw new Error("Workspace mismatch");
const secrets = JSON.parse(fs.readFileSync(".local/db-secrets.json", "utf8"));
const source = await mysql.createConnection({
  host: "127.0.0.1",
  port: 33307,
  user: "root",
  password: secrets.rootPassword,
});
const restoreName = process.argv.includes("--enterprise")
  ? "mariadb-restore-enterprise-" + Date.now()
  : "mariadb-restore";
const restoreDir = path.resolve(".local/" + restoreName);
if (fs.existsSync(restoreDir))
  throw new Error("Restore datadir exists; refuse overwrite");
let target, processHandle;
try {
  const [identity] = await source.query(
    "SELECT @@port AS port,@@datadir AS datadir,VERSION() AS version",
  );
  if (
    identity[0].port !== 33307 ||
    identity[0].datadir.replaceAll("\\", "/").toLowerCase() !==
      "d:/nopapercoop/.local/mariadb-test/"
  )
    throw new Error("Source mismatch");
  const clientFile = path.resolve(".local/backup-client.cnf");
  fs.writeFileSync(
    clientFile,
    `[client]\nhost=127.0.0.1\nport=33307\nuser=root\npassword=${secrets.rootPassword}\n`,
    { mode: 0o600 },
  );
  const dump = execFileSync(
    "C:\\xampp\\mysql\\bin\\mysqldump.exe",
    [
      `--defaults-file=${clientFile}`,
      "--single-transaction",
      "--skip-lock-tables",
      "--skip-comments",
      "--skip-add-drop-table",
      "--skip-triggers",
      "--skip-add-locks",
      "--no-tablespaces",
      "nonpapercoop_test",
    ],
    { maxBuffer: 16 * 1024 * 1024 },
  );
  const key = randomBytes(32),
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(dump), cipher.final()]),
    tag = cipher.getAuthTag();
  const backup = Buffer.concat([iv, tag, encrypted]);
  fs.writeFileSync(".local/test-backup.aesgcm", backup, { mode: 0o600 });
  fs.writeFileSync(".local/test-backup.key", key, { mode: 0o600 });
  function decrypt(data) {
    const d = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
    d.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([d.update(data.subarray(28)), d.final()]);
  }
  const corrupted = Buffer.from(backup);
  corrupted[corrupted.length - 1] ^= 1;
  let rejected = false;
  try {
    decrypt(corrupted);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Corruption accepted");
  const restoredSql = decrypt(
    fs.readFileSync(".local/test-backup.aesgcm"),
  ).toString("utf8");
  if (/\bDROP\s+(TABLE|DATABASE)\b/i.test(restoredSql))
    throw new Error("Destructive dump refused");
  const restorePassword = randomBytes(32).toString("hex");
  fs.writeFileSync(
    ".local/restore-secret.json",
    JSON.stringify({ rootPassword: restorePassword, port: 33308 }),
    { mode: 0o600 },
  );
  execFileSync(
    "C:\\xampp\\mysql\\bin\\mysql_install_db.exe",
    [
      `--datadir=${restoreDir}`,
      `--password=${restorePassword}`,
      "--port=33308",
    ],
    { stdio: "pipe" },
  );
  processHandle = spawn(
    "C:\\xampp\\mysql\\bin\\mysqld.exe",
    [
      "--no-defaults",
      "--basedir=C:/xampp/mysql",
      `--datadir=${restoreDir}`,
      "--port=33308",
      "--bind-address=127.0.0.1",
      "--skip-name-resolve",
      "--default-time-zone=+00:00",
      `--log-error=${restoreDir}/restore-error.log`,
    ],
    { stdio: "ignore", windowsHide: true },
  );
  for (let i = 0; i < 100; i++) {
    try {
      target = await mysql.createConnection({
        host: "127.0.0.1",
        port: 33308,
        user: "root",
        password: restorePassword,
        multipleStatements: true,
      });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!target) throw new Error("Restore target unavailable");
  const [verified] = await target.query(
    "SELECT @@port AS port,@@datadir AS datadir",
  );
  if (
    verified[0].port !== 33308 ||
    verified[0].datadir.replaceAll("\\", "/").toLowerCase() !==
      "d:/nopapercoop/.local/" + restoreName.toLowerCase() + "/"
  )
    throw new Error("Restore target mismatch");
  await target.query(
    "CREATE DATABASE nonpapercoop_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
  );
  await target.changeUser({ database: "nonpapercoop_test" });
  await target.query(restoredSql);
  const [allTables] = await source.query("SHOW TABLES FROM nonpapercoop_test");
  const tables = allTables.map((row) => Object.values(row)[0]);
  if (tables.some((t) => !/^[a-z_]+$/.test(t)))
    throw new Error("Unexpected table name");
  const comparison = [];
  for (const table of tables) {
    const [a] = await source.query(`SELECT * FROM nonpapercoop_test.${table}`),
      [b] = await target.query(`SELECT * FROM nonpapercoop_test.${table}`);
    const digest = (rows) =>
      createHash("sha256")
        .update(JSON.stringify(rows.map((r) => JSON.stringify(r)).sort()))
        .digest("hex");
    if (digest(a) !== digest(b)) throw new Error("Restore mismatch: " + table);
    comparison.push({ table, rows: a.length, sha256: digest(a) });
  }
  const report = {
    status: "PASS",
    source: { port: 33307, engine: identity[0].version },
    restore: { port: 33308, separateDatadir: true, stoppedAfterTest: true },
    cipher: "AES-256-GCM",
    backupSha256: createHash("sha256").update(backup).digest("hex"),
    corruptionRejected: rejected,
    comparison,
    elapsedMs: Date.now() - started,
    scope:
      "Local MariaDB compatibility drill only; MySQL8/VPS/offsite and RPO/RTO acceptance pending",
  };
  await target.query("SHUTDOWN");
  console.log(JSON.stringify(report, null, 2));
  fs.writeFileSync(
    process.argv.includes("--enterprise")
      ? "artifacts/enterprise-restore.json"
      : "artifacts/restore-drill.json",
    JSON.stringify(report, null, 2) + "\n",
  );
} finally {
  await source.end();
  if (target) await target.end();
  if (processHandle && processHandle.exitCode === null) processHandle.kill();
}
