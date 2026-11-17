# QA evidence — TEST0.2, 17 November2026 (Asia/Bangkok)

| Check | Actual result | Evidence / limits |
|---|---|---|
| Runtime | PASS, Node26.13.0 | artifacts/runtime.txt; official SHA256-checked private binary, host Node unchanged |
| Syntax | PASS | artifacts/syntax.txt |
| Unit/HTTP security regression | PASS38 tests | artifacts/unit-integration.txt; mock Google, session/CSRF/RBAC/ABAC validation and prepared-SQL/store checks |
| Real SQL enterprise scenarios | PASS12 tests | artifacts/enterprise-tests.txt; private MariaDB10.4.32 port33307; actual locks/transactions, groups/folders/IDOR, file encryption/quarantine/tamper, sequential/parallel workflow/replay, digest signing state, registry concurrency/idempotency, meetings/quorum/votes, retention/holds, deadline notices and audit chain |
| Login/popup E2E | PASS10 | artifacts/e2e.txt/json; Edge desktop/mobile, mock GIS + memory repository |
| Enterprise UI E2E | PASS8 | artifacts/enterprise-e2e.txt/json; Edge desktop/mobile, mock GIS restricted to one fictional subject + actual TEST SQL; responsive overflow, forms, navigation, safe XSS text and reauthentication→signing_pending→signed evidence |
| Dependency audit | PASS, zero reported vulnerabilities | artifacts/npm-audit.json; point-in-time npm data only |
| Encrypted backup/restore | PASS39 tables | artifacts/enterprise-restore.json/txt; new private datadir/port33308; canonical row hashes all match; corrupt AES-GCM ciphertext rejected; target stopped |
| New live TEST smoke | PASS | artifacts/enterprise-smoke.json; HTTP200, anonymous documents401, font/JS served, approved Admin active, domain chain validates; no automatic real-Google login |
| MySQL8 remote CI | NOT RUN at report creation | Workflow supplied; inspect actual GitHub run after push; local MariaDB result is not MySQL8 evidence |
| Live ClamAV deployment | NOT RUN | Runtime quarantines if scanner unavailable; clean/infected/unavailable branches use an injected scanner only in tests |
| File/offsite recovery | NOT RUN | Restore exercise validates database tables, not all encrypted object fixtures or storage keys/offsite recovery |
| Human UAT, full screen-reader/browser matrix, load/independent penetration test | NOT RUN | No fabricated acceptance, legal compliance or Critical/High application closure |

Images ui-login-{desktop,mobile}.png and ui-dashboard-{desktop,mobile}.png are actually captured from a SQL-backed mock-provider test harness with fictional data; the Google button shown in these captures is a test stub, not proof of a live Google UI/provider result.

QA findings fixed: initial session dependency advisory removed; FK collation normalized; revision number types normalized for MariaDB; focus restoration race fixed; expired Google challenge visibly renews; mobile grid/table overflow fixed; all metadata rendered as text; record-scoped write roles and readonly auditors enforced; explicit submitted/review/signing_pending transitions prevent lifecycle bypass. Original generic Google validation historical reason was not reconstructible; new diagnostics record only safe reason codes.

No Production access/deployment, legacy financial calls, local passwords or stored raw Google token. See MODULE-STATUS.md and RELEASE-GATE.md for remaining scope.

The extended signature browser journey exposed a real Popup integration defect: jQuery objects were cloned by SweetAlert2 and lost event handlers. The central wrapper now unwraps trusted DOM elements, preserving handlers and a single focus trap; the full Desktop/Mobile signing journey passed after this fix. Thai multipart filename normalization and bidi/path spoof rejection have direct regression evidence.
