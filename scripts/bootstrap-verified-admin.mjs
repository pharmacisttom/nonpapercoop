import { config } from "../apps/api/src/config.js";
import { Repository } from "../apps/api/src/repository.js";
import { z } from "zod";
import mysql from "mysql2/promise";
if (process.env.TEST_BOOTSTRAP_APPROVED !== "true")
  throw new Error("Explicit TEST administrator approval required");
const email = z.email().parse(process.env.TEST_ADMIN_EMAIL).toLowerCase();
const pool = mysql.createPool(config().db);
try {
  const result = await new Repository(pool).bootstrapVerifiedAdmin(email);
  console.log(
    "Approved verified TEST administrator created:",
    result.email,
    result.id,
  );
} finally {
  await pool.end();
}
