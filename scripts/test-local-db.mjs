import fs from "node:fs";
import { spawnSync } from "node:child_process";
const s = JSON.parse(fs.readFileSync(".local/db-secrets.json", "utf8"));
const env = {
  ...process.env,
  APP_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:3100",
  COOKIE_SECURE: "false",
  SESSION_SECRET: "test-only-never-deploy-".repeat(4),
  GOOGLE_CLIENT_ID: "fixture.apps.googleusercontent.com",
  MYSQL_HOST: "127.0.0.1",
  MYSQL_PORT: String(s.port),
  MYSQL_DATABASE: "nonpapercoop_test",
  MYSQL_USER: "nonpapercoop_test",
  MYSQL_PASSWORD: s.appPassword,
  RUN_MYSQL_TESTS: "true",
  ALLOW_MARIADB_COMPAT: "true",
};
const result = spawnSync(process.execPath, ["--test", "tests/mysql.test.js"], {
  env,
  stdio: "inherit",
  windowsHide: true,
});
process.exitCode = result.status ?? 1;
