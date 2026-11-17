# Google identity validation diagnostic update — 2026-11-17

User reported generic `Google identity validation failed` on TEST sign-in. Historical audit recorded only `auth.invalid-claims`; no raw claims/token had been retained, so the precise historical cause cannot be reconstructed or claimed fixed.

Changes: identity.js retains all previous signature-library/issuer/audience/authorized-party/subject/email/expiry/issued-at/nonce/challenge-age checks, assigns only a safe fixed reason code on failure, and returns actionable Thai retry text. app.js audits that reason code, never token or claim values. Login challenge API exposes its expiry; frontend hides the expired Google button and offers an explicit fresh challenge after five minutes, without silently extending a nonce lifetime or approving accounts. Existing nonce replay protections remain intact.

Evidence: artifacts/google-validation-tests.txt —31 unit/HTTP tests PASS; artifacts/e2e.txt and e2e.json —10 Edge desktop/mobile tests PASS including expired challenge refresh. Real Google success/root-cause determination requires a new user sign-in; simulated tests do not establish it. No administrator creation is claimed without artifacts/admin-bootstrap.json recording successful approval from verified subject evidence.

Changed files: apps/api/src/{identity.js,app.js}; apps/web/public/{index.html,assets/js/app.js}; tests/unit/identity.test.js; tests/e2e/ui.spec.js. No schema changes in this update. Restarted only recorded TEST PID after executable/command validation; no Production access.

Rollback: revert this update's changes and restart only the verified TEST process. Keep audit and enrollment records. Do not disable nonce/token checks or broaden the allowlist as a workaround. The prior UI would again use a generic error and not offer challenge-expiry refresh.

Reference reviewed: https://developers.google.com/identity/gsi/web/reference/js-reference (GIS nonce/initialization) and https://developers.google.com/identity/gsi/web/guides/verify-google-id-token (backend token verification).
