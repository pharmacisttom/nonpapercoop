import { test } from "node:test";
import assert from "node:assert/strict";
import { validateIdentity } from "../../apps/api/src/identity.js";
import { config } from "../../apps/api/src/config.js";
const now = Date.now(),
  sec = Math.floor(now / 1000),
  options = { clientId: "test", nonce: "nonce", issuedAt: now, now };
const good = {
  sub: "123",
  email: "test@example.invalid",
  email_verified: true,
  iss: "https://accounts.google.com",
  aud: "test",
  exp: sec + 300,
  iat: sec,
  nonce: "nonce",
};
test("valid Google claims use stable sub", () =>
  assert.equal(validateIdentity(good, options).sub, "123"));
for (const [key, value] of Object.entries({
  iss: "https://evil.invalid",
  aud: "evil",
  azp: "evil",
  exp: sec - 1,
  iat: sec + 600,
  nonce: "other",
  email_verified: false,
  sub: "",
  email: null,
}))
  test("reject invalid " + key, () =>
    assert.throws(() => validateIdentity({ ...good, [key]: value }, options)),
  );
test("expired challenge rejected", () =>
  assert.throws(() =>
    validateIdentity(good, { ...options, issuedAt: now - 300001 }),
  ));
test("fresh valid token with old challenge identifies expiry without token data", () => {
  const future = now + 300001;
  assert.throws(
    () =>
      validateIdentity(
        {
          ...good,
          iat: Math.floor(future / 1000),
          exp: Math.floor(future / 1000) + 300,
        },
        { ...options, now: future },
      ),
    (e) =>
      e.code === "GOOGLE_CHALLENGE_EXPIRED" &&
      !e.message.includes("Google identity validation failed"),
  );
});
test("nonce mismatch records a safe reason code", () =>
  assert.throws(
    () => validateIdentity({ ...good, nonce: "bad" }, options),
    (e) => e.code === "GOOGLE_NONCE",
  ));
test("configuration refuses production and reused database", () => {
  assert.throws(() => config({ APP_ENV: "production" }));
  assert.throws(() =>
    config({
      APP_ENV: "test",
      APP_ORIGIN: "http://127.0.0.1:3100",
      COOKIE_SECURE: "false",
      SESSION_SECRET: "s".repeat(64),
      GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
      MYSQL_HOST: "127.0.0.1",
      MYSQL_DATABASE: "RYCOOPWEB",
      MYSQL_USER: "nonpapercoop_test",
    }),
  );
});
