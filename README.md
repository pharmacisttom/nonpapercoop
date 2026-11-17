# NonPaperCoop — TEST cooperative document workspace

เวอร์ชันพัฒนา 0.2.0 ตาม Blueprint v1.1 ทำงานเฉพาะ TEST และยังไม่ผ่าน Production Release Gate

## ใช้งานได้ใน TEST

- Google GIS/OIDC เท่านั้น, verified-sub allowlist, server-side sessions, CSRF, reauthentication และ session revocation ไม่มี local password/register/reset
- องค์กร: ฝ่าย สมาชิก กลุ่ม บทบาทหลายรายการและขอบเขตฝ่าย; สิทธิ์เอกสารรายคน/กลุ่ม; Admin ไม่ได้สิทธิ์อ่านเอกสารของผู้อื่นอัตโนมัติ
- เอกสาร: Metadata/เนื้อหา/Tags, immutable revisions, เอกสารทั่วไป/สารบรรณ/การเงิน/จัดซื้อ/สมาชิก/คณะกรรมการ; private folders และค้นหาตามสิทธิ์
- ไฟล์ PDF/TXT: จำกัด10MB, ตรวจชื่อและชนิดไฟล์, AES-256-GCM นอก Web Root, ClamAV INSTREAM, quarantine เมื่อ scanner ไม่พร้อม, ดาวน์โหลดผ่าน API ที่ตรวจสิทธิ์และ Hash
- Workflow แบบ sequential/parallel all/any, Maker–Checker, return/revision/reject/delegate/cancel, version locking/idempotency และแจ้งเตือนงานเกินกำหนดภายในระบบ
- หลักฐานเจตนาลงนามที่ผูก SHA-256/ฉบับ/ผู้ลงนาม, ตรวจ integrity, ทะเบียนรับ/ส่ง/ภายในแบบ counter lock, distribution/acknowledgement
- ประชุม: นัดหมาย ผู้เข้าร่วม องค์ประชุม/กติกาลงคะแนนที่กำหนดเอง ส่วนได้เสีย ลงคะแนน มติ และเผยแพร่รายงาน
- แม่แบบ versioned, retention policies, archive, Legal Hold และคำขอทำลายแบบผู้ขอ/ผู้ตรวจคนละคน; **ไม่มีการลบไฟล์จริงอัตโนมัติ**
- Dashboard/CSV ตามสิทธิ์, notifications, audit chain ภายใน, responsive Thai UI, self-hosted Noto Sans Thai/DataTables/SweetAlert2 11.26.25

หลักฐานลงนามนี้ไม่ใช่ Cryptographic PDF Signature/TSA และไม่ใช่การรับรองกฎหมาย เอกสารสำคัญ/ลับถูกบล็อกการอนุมัติ/ลงนาม/ส่งออกจนมีนโยบาย assurance ที่ตรวจสอบได้ Google reauthentication ไม่ถูกอ้างว่าเป็น MFA

## Setup

1. ใช้ Node26 LTS และ MySQL8 บนเครื่อง/ฐานข้อมูลใหม่อิสระ `npm ci --ignore-scripts`
2. คัดลอก `.env.example` เป็น `.env`; สร้าง TEST session secret, DB credentials และ STORAGE_KEY (base64 ของ random32bytes) ใหม่ทั้งหมด
3. Local origin `http://127.0.0.1:3100` ใช้ COOKIE_SECURE=false เฉพาะ loopback; VPS TEST ต้อง HTTPS/Secure cookies
4. DBA ตรวจ/อนุมัติ migrations001–004 ตามลำดับหลัง Backup ก่อนรันบน nonpapercoop_test เท่านั้น; ไม่มี automatic migration หรือ destructive down migration
5. ใช้ runtime grants แบบจำกัดตาม [TEST runbook](docs/runbooks/TEST-DEPLOY.md) และ [CI initializer](scripts/ci-migrate.mjs) ซึ่งใช้ได้เฉพาะ fresh CI
6. ตั้งค่า TEST Google client ใหม่ตาม [Google ADR](docs/architecture/ADR-001-GOOGLE.md); bootstrap เฉพาะ identity ที่ผู้มีอำนาจอนุมัติตาม [คู่มือ](docs/runbooks/ADMIN-ENROLLMENT.md)
7. เปิด ClamAV clamd loopback3310 ก่อนปล่อยไฟล์; หากไม่พร้อมระบบยังรับเข้ากักกันและปฏิเสธการดาวน์โหลด/ส่งอนุมัติ
8. `npm start`; Node ฟัง loopback เท่านั้น ใช้ Nginx/systemd templates ที่ผ่าน review บน TEST VPS ใหม่ ไม่แตะระบบเดิม

เครื่องพัฒนานี้ใช้ XAMPP binaries เปิด MariaDB10.4.32 แยก datadir ที่ `.local/mariadb-test` port33307 ข้อมูล/รหัสทั้งหมดใหม่ ไม่ใช้ XAMPP service/datadir เดิม เป็น compatibility target ไม่ใช่ MySQL8 หรือ Production recommendation
Node26 ที่ตรวจ SHA256 แล้วอยู่ `.local/node26/node-v26.13.0-win-x64/node.exe`; Node เดิมของเครื่องไม่เปลี่ยน

## Tests / evidence

```text
npm run check
npm test
npm run test:enterprise
npm run test:e2e
npm run openapi
npm audit --audit-level=high
```

Enterprise SQL suite: `node --env-file=.env --test --test-concurrency=1 tests/enterprise/*.test.js` ตรวจ port33307; สร้างข้อมูลสมมติและเพิกถอนบัญชี fixture เมื่อเสร็จ เก็บประวัติ ไม่ลบข้อมูล
Enterprise E2E: ตั้ง E2E_ENTERPRISE=true แล้ว `node --env-file=.env scripts/test-e2e.mjs`; ใช้ fake Google verifier **เฉพาะ TEST harness** กับ SQL จริง ไม่ได้ทดสอบ Google จริงแทนผู้ใช้
Windows ใช้ Edge; Linux CI ใช้ PW_CHANNEL=chromium และติดตั้ง Playwright browser ก่อน

รายงานล่าสุด: [QA](docs/uat/UAT-RESULTS.md), [ขอบเขตและข้อจำกัด](docs/uat/MODULE-STATUS.md), [Release gate](docs/uat/RELEASE-GATE.md), [Rollback](docs/runbooks/ROLLBACK.md)
OpenAPI เป็น JSON-compatible YAML: [openapi.yaml](docs/api/openapi.yaml) สร้างจาก route inventory และ Zod schemas; รายละเอียดกฎธุรกิจอยู่ใน services/schemas

## Safety

`.env`, `.local`, credentials, encrypted backups/keys, datadirs และหลักฐานบัญชีจริงถูก Git ignore ไม่มีการนำ Token/Client Secret ไปเก็บใน Browser storage หรือ logs ไม่เชื่อม RYCOOPWEB/การเงินเดิม ไม่มี Production deployment workflow
Restore drill ต้องใช้ targetใหม่ทุกครั้ง; `node scripts/local-restore-drill.mjs --enterprise` ใช้เฉพาะ private local instances ที่ระบุไว้ ตรวจ DB rows ไม่ใช่การรับรอง offsite/file recovery/RPO/RTO

Local QA evidence under artifacts/ is intentionally excluded from Git publication. It remains available in the shared workspace; GitHub Actions can independently regenerate evidence using only disposable/fictitious CI data. Raw local account evidence, screenshots, restore hashes and operator logs are not part of the source payload sent to GitHub.
