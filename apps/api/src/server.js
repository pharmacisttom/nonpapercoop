import mysql from "mysql2/promise";
import { MySQLSessionStore } from "./session-store.js";
import { config as loadConfig } from "./config.js";
import { Repository } from "./repository.js";
import { googleVerifier } from "./identity.js";
import { createApp } from "./app.js";
import { notifyOverdue } from "./modules/deadlines.js";
const config = loadConfig();
const pool = mysql.createPool(config.db);
await pool.query("SELECT 1");
const store = new MySQLSessionStore(pool);
const app = createApp({
  config,
  repo: new Repository(pool),
  store,
  verify: googleVerifier(config.clientId),
});
const server = app.listen(config.port, "127.0.0.1", () =>
  console.log(`NonPaperCoop TEST listening on loopback:${config.port}`),
);
let deadlineRunning = false;
const deadlineTimer = setInterval(async () => {
  if (deadlineRunning) return;
  deadlineRunning = true;
  try {
    await notifyOverdue(new Repository(pool));
  } catch {
    console.error("TEST deadline notification worker failed");
  } finally {
    deadlineRunning = false;
  }
}, 60000);
deadlineTimer.unref();
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    clearInterval(deadlineTimer);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
