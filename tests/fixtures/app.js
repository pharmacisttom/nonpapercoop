import session from "express-session";
import { createApp } from "../../apps/api/src/app.js";
import { TestRepository } from "./repository.js";
export const testConfig = {
  origin: "http://127.0.0.1:3199",
  secure: false,
  secret: "s".repeat(64),
  clientId: "test.apps.googleusercontent.com",
};
export function fixture() {
  const repo = new TestRepository(),
    store = new session.MemoryStore();
  let payload;
  let now = Date.now();
  const app = createApp({
    config: testConfig,
    repo,
    store,
    verify: async () => {
      if (payload instanceof Error) throw payload;
      return payload;
    },
    clock: () => now,
  });
  return {
    app,
    repo,
    store,
    setPayload: (p) => {
      payload = p;
    },
    advance: (ms) => {
      now += ms;
    },
    claims: (nonce, sub = "1002") => ({
      sub,
      email: "fictional@example.invalid",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: testConfig.clientId,
      iat: Math.floor(now / 1000),
      exp: Math.floor(now / 1000) + 3600,
      nonce,
    }),
  };
}
