import { test, expect } from "@playwright/test";
import fs from "node:fs";
test.beforeEach(async ({ page }) => {
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
  await expect(page.locator("#page-title")).toHaveText("ภาพรวมการทำงาน");
  await expect(page.locator(".swal2-container")).toHaveCount(0);
}
async function nav(page, name) {
  if (await page.locator(".menu-button").isVisible())
    await page.locator(".menu-button").click();
  await page
    .getByRole("navigation", { name: "เมนูหลัก" })
    .getByRole("button", { name, exact: true })
    .click();
}
test("modern login and permission-aware dashboard render with self-hosted Thai font", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.locator(".login-story h1")).toBeVisible();
  await page.screenshot({
    path: "artifacts/ui-login-" + info.project.name + ".png",
    fullPage: true,
  });
  await enter(page);
  await expect(page.locator(".metric-card")).toHaveCount(4);
  await expect(page.locator(".welcome-card h2")).toContainText("ยินดีต้อนรับ");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/ui-dashboard-" + info.project.name + ".png",
    fullPage: true,
  });
});
test("document form creates actual SQL-backed metadata, XSS stays inert and modal keyboard closes", async ({
  page,
}) => {
  await enter(page);
  await page
    .locator(".page-actions")
    .getByRole("button", { name: "สร้างเอกสารร่าง" })
    .click();
  await page
    .getByLabel("ชื่อเอกสาร", { exact: true })
    .fill("<img src=x onerror=alert(1)>");
  await page.getByLabel("เนื้อหา / รายละเอียด").fill("ข้อความภาษาไทยสำหรับทดสอบ");
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/documents") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  const record = (await (await saved).json()).data;
  await expect(
    page.getByRole("heading", { name: "สำเร็จ", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ตกลง", exact: true }).click();
  await nav(page, "เอกสารทั้งหมด");
  await expect(page.locator("#module-panel")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  await expect(page.locator("#module-panel img")).toHaveCount(0);
  await page
    .locator("#module-panel")
    .getByRole("button", { name: "รายละเอียด", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const challenge = await (
    await page.request.get("/api/v1/auth/google/start")
  ).json();
  const removed = await page.request.delete("/api/v1/documents/" + record.id, {
    headers: {
      Origin: "http://127.0.0.1:3199",
      "X-CSRF-Token": challenge.data.csrf,
    },
    data: { version: record.version },
  });
  expect(removed.status()).toBe(200);
});
test("mobile menu and operational modules are reachable without horizontal page overflow", async ({
  page,
}) => {
  await enter(page);
  for (const name of [
    "งานรอพิจารณา",
    "ทะเบียนสารบรรณ",
    "การประชุม",
    "ค้นหาเอกสาร",
    "แม่แบบเอกสาร",
    "รายงาน",
  ]) {
    await nav(page, name);
    await expect(page.locator("#page-title")).toHaveText(
      name === "รายงาน" ? "รายงาน" : name,
    );
    await expect(
      page
        .locator("#module-panel .empty-state h3")
        .filter({ hasText: "ไม่สามารถโหลดข้อมูลได้" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  if (await page.locator(".menu-button").isVisible()) {
    await page.locator(".menu-button").click();
    await expect(page.locator("body")).toHaveClass(/menu-open/);
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveClass(/menu-open/);
  }
});
test("reauthenticated signature UI enters signing_pending then records matching evidence", async ({
  page,
}, info) => {
  const fixture = JSON.parse(
    fs.readFileSync(".local/e2e-signing-fixtures.json", "utf8"),
  )[info.project.name];
  await enter(page);
  await page
    .getByRole("button", { name: "ยืนยันตัวตนซ้ำด้วย Google", exact: true })
    .click();
  await expect(page.locator("#login")).toBeVisible();
  await page.getByRole("button", { name: "Sign in with Google" }).click();
  await expect(
    page.getByRole("heading", { name: "สำเร็จ", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ตกลง", exact: true }).click();
  await expect(page.locator("#page-title")).toHaveText("ภาพรวมการทำงาน");
  await nav(page, "เอกสารทั้งหมด");
  await page.getByRole("searchbox", { name: "ค้นหาเอกสาร" }).fill(fixture.title);
  await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
  await page
    .locator("#module-panel")
    .getByRole("button", { name: "รายละเอียด", exact: true })
    .click();
  await page.getByRole("button", { name: "ลงนาม", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ยืนยันเจตนาลงนาม" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ตกลง", exact: true }).click();
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "สำเร็จ", exact: true }),
  ).toBeVisible();
  const verification = await (
    await page.request.get(
      "/api/v1/documents/" + fixture.documentId + "/verify",
    )
  ).json();
  expect(verification.data.signed).toBe(true);
  expect(verification.data.integrityValid).toBe(true);
});
