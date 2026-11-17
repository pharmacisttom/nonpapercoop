import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
function scan(dir) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + "/" + f.name;
    if (f.isDirectory()) scan(p);
    else if (/\.(js|mjs)$/.test(p))
      execFileSync(process.execPath, ["--check", p], { stdio: "inherit" });
  }
}
for (const d of ["apps", "scripts", "tests"]) scan(d);
console.log("JavaScript syntax checks passed");
