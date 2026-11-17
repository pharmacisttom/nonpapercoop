import { spawn } from "node:child_process";
const server = spawn(process.execPath, ["tests/fixtures/browser-server.js"], {
  stdio: "inherit",
  windowsHide: true,
});
let exitCode = 1;
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (server.exitCode !== null) throw new Error("Harness failed");
    try {
      const r = await fetch("http://127.0.0.1:3199/api/v1/health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error("Readiness timeout");
  const child = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    {
      stdio: "inherit",
      windowsHide: true,
      env: { ...process.env, PW_EXTERNAL_SERVER: "true" },
    },
  );
  exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  server.kill();
}
process.exitCode = exitCode;
