# Requirements traceability — TEST0.2

User instructions control scope and authorization; Blueprint v1.1 supersedes earlier local-password text. Sources remain unchanged in repository. Completion/acceptance is not inferred from a feature being present in code.

| Requirement | Implemented evidence | Remaining |
|---|---|---|
| Independent TEST/no legacy access | fixed local ports/datadirs/accounts, config guards, additive migrations/backups | Dedicated VPS/firewall/egress verification |
| Google only / stable sub / allowlist | identity.js, verified enrollment, actual approved TEST mapping, session/store/API tests | Broader provider outage/key-refresh/cookie browser matrix; no MFA assertion |
| Secure sessions/CSRF/revocation | request Origin+CSRF, rotation, idle/absolute TTL, version invalidation | Concurrent sessions/idle UI policy/load review |
| Organization and ABAC | departments/groups/memberships/scoped grants, record ACL, private folders; negative SQL tests | Stakeholder role policy/delegated authority review |
| Documents/files | content/domain metadata/tags/revisions, encrypted PDF/TXT, quarantine/magic bytes, protected downloads | Live scanner ops, office formats, conversion/OCR/watermark/redaction |
| Workflow | validated transition table, versioned definitions, sequential/parallel tasks, maker-checker, return/delegate/cancel/deadline notices | Advanced visual designer, external delivery |
| Registry | signed digest requirement, transactional counter, Bangkok/BE year, unique/idempotent concurrent assignment | User-configurable number formats |
| Signing | approved→signing_pending→signed, intent/current hash/session evidence, immutable events | Provider-attested high assurance, certificate/PDF/TSA/legal approval |
| Meetings | explicit quorum/rule, conflicts/attendance/votes/resolutions/minutes and independent attachment ACL | Bylaw approval/human governance UAT |
| Retention | explicit years/basis, archive, holds, separate disposal reviewer | No destructive execution without separate approval |
| Search/reporting | permission-filtered title/content search, scoped dashboard/CSV, browser print/PDF | Full-text/OCR, batch jobs/PDF reports/complete SLA analytics |
| Audit | transaction+hash chain, append-only DB grants, restricted viewer, negative update test | External immutable anchor and operational alerting review |
| UI | self-hosted Thai typography, sidebar, responsive tables, central safe DOM Popup forms/actions | Full accessibility and browser sign-off |
| QA/recovery | actual unit/SQL/E2E/artifacts and isolated encrypted DB restore | MySQL8 CI evidence, file/offsite/DR, load/pen-test, human UAT |

Lists paginate with caps (default25/max200). CSV max200 is explicit. No public document/file access, no financial ledger/payment integration/member portal. High-risk approval/signing/export remains denied until reviewed assurance is available. Source and test evidence is not legal certification or Production readiness.
