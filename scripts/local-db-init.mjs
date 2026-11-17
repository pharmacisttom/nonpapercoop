// Explicit local development initializer; no shared XAMPP data/config/service access.
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = path.resolve(".local");
const datadir = path.join(root, "mariadb-test");
if (path.resolve(process.cwd()) !== "D:\\nopapercoop")
  throw new Error("Workspace mismatch");
if (fs.existsSync(datadir))
  throw new Error("Data directory exists; never reinitialize");
fs.mkdirSync(root, { recursive: true });
if (fs.existsSync(path.join(root, "db-secrets.json")))
  throw new Error("Secrets already exist");
const secrets = {
  rootPassword: randomBytes(32).toString("hex"),
  appPassword: randomBytes(32).toString("hex"),
  port: 33307,
};
fs.writeFileSync(path.join(root, "db-secrets.json"), JSON.stringify(secrets), {
  mode: 0o600,
});
execFileSync(
  "C:\\xampp\\mysql\\bin\\mysql_install_db.exe",
  [
    `--datadir=${datadir}`,
    `--password=${secrets.rootPassword}`,
    "--port=33307",
  ],
  { stdio: "inherit" },
);
console.log(
  "New isolated TEST datadir initialized; no shared XAMPP data used.",
);
