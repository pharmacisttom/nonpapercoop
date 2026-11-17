import fs from "node:fs";
import { execFileSync } from "node:child_process";
const files = execFileSync(
  "git",
  ["-c", "safe.directory=" + process.cwd(), "ls-files", "--cached", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
let failures = 0;
for (const file of files) {
  if (
    /(^|\/)(\.env|\.local|\.npm-cache|node_modules)(\/|$)/.test(file) ||
    /db-secrets|\.key$|\.aesgcm$|admin-bootstrap\.json$/.test(file)
  ) {
    console.error("Private path staged:", file);
    failures++;
    continue;
  }
  if (!/\.(js|mjs|json|md|yml|yaml|sql|html|css|example|txt)$/.test(file))
    continue;
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of [
    /GOCSPX-[A-Za-z0-9_-]{12,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/,
  ])
    if (pattern.test(text)) {
      console.error("Potential secret detected in:", file);
      failures++;
      break;
    }
}
if (failures) process.exitCode = 1;
else
  console.log(
    "Staged-file secret scan passed:",
    files.length,
    "paths; no private env/datadir/key/token patterns found",
  );
