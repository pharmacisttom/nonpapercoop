export function config(env = process.env) {
  if (!["test", "development"].includes(env.APP_ENV))
    throw new Error("Only TEST/development environments are permitted");
  const origin = new URL(env.APP_ORIGIN || "http://127.0.0.1:3100");
  const secure = env.COOKIE_SECURE !== "false";
  if (!secure && !["127.0.0.1", "localhost"].includes(origin.hostname))
    throw new Error("Insecure cookies allowed only on loopback");
  if (secure && origin.protocol !== "https:") throw new Error("HTTPS required");
  if (
    !env.SESSION_SECRET ||
    env.SESSION_SECRET.length < 48 ||
    env.SESSION_SECRET.includes("REPLACE")
  )
    throw new Error("Provide a random session secret, minimum 48 characters");
  if (
    !env.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com") ||
    env.GOOGLE_CLIENT_ID.startsWith("NEW_TEST")
  )
    throw new Error("New TEST Google client ID required");
  if (
    env.MYSQL_DATABASE !== "nonpapercoop_test" ||
    env.MYSQL_USER !== "nonpapercoop_test"
  )
    throw new Error("Only isolated nonpapercoop_test database/account allowed");
  if (!["127.0.0.1", "localhost"].includes(env.MYSQL_HOST))
    throw new Error("Use loopback MySQL on isolated TEST host");
  return {
    origin: origin.origin,
    secure,
    secret: env.SESSION_SECRET,
    clientId: env.GOOGLE_CLIENT_ID,
    port: Number(env.PORT || 3100),
    storageKey: env.STORAGE_KEY,
    storageRoot: env.STORAGE_ROOT,
    db: {
      host: env.MYSQL_HOST,
      port: Number(env.MYSQL_PORT || 3306),
      database: env.MYSQL_DATABASE,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      connectionLimit: 5,
      multipleStatements: false,
      timezone: "Z",
    },
  };
}
