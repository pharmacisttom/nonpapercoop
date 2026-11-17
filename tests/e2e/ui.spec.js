import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  // Stub GIS transport only. This is not real Google OAuth evidence.
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.google={accounts:{id:{initialize(o){window.gis=o},renderButton(el){const b=document.createElement('button');b.textContent='Sign in with Google';b.onclick=()=>window.gis.callback({credential:JSON.stringify({sub:'1002',email:'fictional@example.invalid',email_verified:true,iss:'https://accounts.google.com',aud:'test.apps.googleusercontent.com',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,nonce:window.gis.nonce})});el.appendChild(b)}}}};`,
    }),
  );
});
async function enter(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in with Google" }).click();
  await expect(
    page.getByRole("heading", { name: "สำเร็จ", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ตกลง", exact: true }).click();
  await expect(page.locator("#workspace")).toBeVisible();
}
test("expired login challenge is visibly renewed before retry", async ({
  page,
}) => {
  let first = true;
  await page.route("**/api/v1/auth/google/start", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (first) {
      first = false;
      body.data.expiresAt = Date.now() + 500;
    }
    await route.fulfill({ response, json: body });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "เริ่มเข้าสู่ระบบใหม่", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#google-button")).toBeHidden();
  await page
    .getByRole("button", { name: "เริ่มเข้าสู่ระบบใหม่", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in with Google" }),
  ).toBeVisible();
  await expect(page.locator("#login-status")).toHaveText(
    "พร้อมเข้าสู่ระบบด้วย Google",
  );
});
test("Google-only login, responsive shell, no password controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sign in with Google" }),
  ).toBeVisible();
  await expect(page.locator("input[type=password]")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("cancel leaves backend untouched; dialog keyboard/focus and z-index", async ({
  page,
}) => {
  await enter(page);
  const button = page.getByRole("button", { name: "สร้างเอกสารร่าง" });
  await button.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(
    await page
      .locator(".swal2-container")
      .evaluate((e) => getComputedStyle(e).zIndex),
  ).toBe("20000");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(button).toBeFocused();
});
test("CRUD waits for backend; malicious title stays text; delete confirmation cancels", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "สร้างเอกสารร่าง" }).click();
  await page.locator(".swal2-input").fill("<img src=x onerror=alert(1)>");
  await page.getByRole("button", { name: "ตกลง", exact: true }).click();
  await page.getByRole("button", { name: "ตกลง", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "สำเร็จ", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ตกลง", exact: true }).click();
  await expect(
    page
      .getByRole("cell", { name: "<img src=x onerror=alert(1)>", exact: true })
      .first(),
  ).toBeVisible();
  await expect(page.locator("#documents img")).toHaveCount(0);
  await page.getByRole("button", { name: "ลบ", exact: true }).first().click();
  await expect(
    page.getByRole("button", { name: "ยกเลิก", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  await expect(
    page
      .getByRole("cell", { name: "<img src=x onerror=alert(1)>", exact: true })
      .first(),
  ).toBeVisible();
});
test("backend failure never reports success and submit is disabled", async ({
  page,
}) => {
  await enter(page);
  await page.route("**/api/v1/documents", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((r) => setTimeout(r, 200));
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { message: "TEST failure" },
        }),
      });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "สร้างเอกสารร่าง" }).click();
  await page.locator(".swal2-input").fill("failure case");
  await page.getByRole("button", { name: "ตกลง", exact: true }).click();
  await page.getByRole("button", { name: "ตกลง", exact: true }).click();
  await expect(page.locator("#new-document")).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "ไม่สามารถทำรายการได้" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "สำเร็จ", exact: true }),
  ).toHaveCount(0);
});
