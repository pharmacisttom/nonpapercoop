import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  testMatch:
    process.env.E2E_ENTERPRISE === "true" ? "enterprise.spec.js" : "ui.spec.js",
  workers: 1,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          process.env.E2E_ENTERPRISE === "true"
            ? "artifacts/enterprise-e2e.json"
            : "artifacts/e2e.json",
      },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:3199",
    browserName: "chromium",
    channel: process.env.PW_CHANNEL || "msedge",
    screenshot: "only-on-failure",
  },
  webServer:
    process.env.PW_EXTERNAL_SERVER === "true"
      ? undefined
      : {
          command: "node tests/fixtures/browser-server.js",
          url: "http://127.0.0.1:3199/api/v1/health",
          reuseExistingServer: false,
        },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 960 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
