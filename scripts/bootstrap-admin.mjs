import { config } from "../apps/api/src/config.js";
import mysql from "mysql2/promise";
import { Repository } from "../apps/api/src/repository.js";
import { z } from "zod";
// Run manually only after two reviewers approve the actual TEST identity.
if (process.env.TEST_BOOTSTRAP_APPROVED !== "true")
  throw new Error("Reviewed TEST bootstrap approval required");
const c = config(),
  pool = mysql.createPool(c.db);
try {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE role='system_admin' LIMIT 1",
  );
  if (rows.length) throw new Error("Admin already exists; use audited UI");
  const data = {
    email: z.email().parse(process.env.TEST_ADMIN_EMAIL),
    googleSub: z
      .string()
      .regex(/^[0-9]{1,255}$/)
      .parse(process.env.TEST_ADMIN_SUB),
    role: "system_admin",
  };
  const u = await new Repository(pool).createUser(null, data);
  console.log("Approved TEST administrator created:", u.id);
} finally {
  await pool.end();
}
