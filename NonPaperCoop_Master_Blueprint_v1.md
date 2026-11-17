# NONPAPERCOOP — MASTER BLUEPRINT & CODING AGENT PROMPT v1.0
วันที่: 16 พฤศจิกายน 2569 (2026-11-16)
สถานะ: Design specification / NOT DEPLOYED

## 0. Mission & hard boundaries
Build a complete cooperative enterprise electronic-document and paperless platform called **NonPaperCoop** using HTML5, CSS3, jQuery, Node.js 26 LTS, Express.js and MySQL 8. Use a dedicated standalone VPS. TEST-first only. Do not connect to, modify, probe, migrate, or deploy to any existing RYCOOPWEB, Smart Finance, or cooperative production system. Never reuse old credentials, infrastructure paths, databases, backups, or production personal information. The proposed example hostnames and paths are illustrative, not currently deployed.

## 1. Operating principles for the coding agent
You are Principal Software Architect, Senior Full-Stack Engineer, DBA, UX Lead, Cybersecurity Lead and QA Lead. Deliver complete, runnable code, SQL migrations, seed fixtures, automated tests, user documentation, deployment runbook, and UAT evidence. Work in reproducible incremental changes; inspect the repository before editing. Never claim tests pass unless executed with evidence. Never fabricate screenshots, audit results, approvals or deployment status. Treat every production operation as out of scope. Require explicit human authorization for any irreversible operation, even in TEST.

Use one Node.js backend serving REST APIs and static HTML/CSS/jQuery views, with modular services, MVC-ish controllers, and repositories. Prefer a modular monolith and async workers rather than premature microservices. Use npm lockfile and pinned versions, linting, tests and CI.

## 2. Functional modules (required)
A. Identity & Organization: users, roles, permissions, groups, departments, delegation, MFA, session management, restricted auditor access.
B. Registry / E-Saraban: inbound, outbound, internal, circular, memo, notices; numbering sequences with transaction locks, attachment verification, dispatch & acknowledgement, tracking.
C. Authoring & Templates: reusable templates with Thai fonts, versioning, drafts, preview, PDF rendering, approved master copies.
D. Approval Workflow: versioned flow definitions, step assignments, sequential/parallel steps, maker-checker, rejection, return-for-revision, delegation, deadlines, escalation, abstention/conflict-of-interest, status history.
E. Signing: electronic-signature evidentiary bundle; verified signer identity, clear intent, original document SHA-256, timestamp with reliable time source, signature event, IP/device context with privacy controls, tamper detection. Support cryptographic PDF signing / timestamp authority integration as future configured provider; do not falsely assert compliance or long-term validation without provider and legal signoff.
F. Meetings & governance: calendar, agendas, confidential board packs, attendance, quorum parameters, conflicts, motions, resolutions, minute drafting, publication and archival. Quorum and voting must be configurable per bylaw, not guessed.
G. Finance & procurement document packets: requests, invoices, vouchers, budgets as attachments/metadata, contracts, procurement checklists, approval limits. This is NOT the financial ledger; no transfer of money or changes in production accounting.
H. Member-document service: internal intake and processing of member forms, subject-access constraints, redaction, retention, download watermarks for sensitive material. Do NOT automatically expose records to public member portal.
I. Enterprise repository: hierarchical categories, rich tags, metadata, OCR optional, full-text search with access filtering, version history, immutable released versions, legal holds, retention and disposal workflow.
J. Reporting: executive, department, pending approvals, bottleneck/SLA, document throughput, retention, security events, export CSV/PDF with permission checks.
K. Administration: master data, number formats, classifications, retention policies, templates, workflow designer with controlled publication, feature flags, audit viewer, health and backups read-only status.
L. Notifications: in-app and optional email; no sensitive content in external notifications, use permission-protected deep links.

## 3. Document state machine
DRAFT -> SUBMITTED -> IN_REVIEW -> APPROVED -> SIGNING_PENDING -> SIGNED -> REGISTERED -> DISTRIBUTED -> ARCHIVED.
Alternative transitions: RETURNED_FOR_REVISION -> DRAFT (new document version), REJECTED, CANCELLED before finalization, EXPIRED (only when defined). State transitions must be a validated server-side table, not merely frontend labels. Signed/registered originals are immutable; corrections create superseding document records with a traceable link. Acknowledgement receipt is separately tracked.

## 4. Roles and authorization
Roles: system_admin, security_admin, records_officer, department_staff, department_head, manager, chairperson, board_member, finance_officer, procurement_officer, auditor_readonly, member_service_officer. A user may hold several roles; effective permissions depend on resource owner, department, classification, delegation, and document state. Access must be DENY-BY-DEFAULT on every endpoint and file download, including search/export/preview. Sensitive financial, member and governance documents require resource-level ACL / ABAC in addition to RBAC. Admin is not automatically allowed to read confidential documents; break-glass requires approval, reason, time limit, alert and audit. Maker cannot approve own controlled finance request. Avoid role names hardcoded throughout views.

## 5. Tech architecture
Frontend: server-served accessible HTML5; CSS3 with design tokens; Bootstrap 5 if needed; jQuery for AJAX and DOM; DataTables, Select2 and SweetAlert2 after compatibility review. No React/Next.js required. CSP without inline handlers or unsafe-eval where feasible. Use DOM .text() and safe element construction for untrusted data.
Backend: Node.js 26 LTS, Express, modular routes/controllers/services/repositories, mysql2 prepared statements and pool, schema validation (Zod/Joi equivalent), structured logs with sensitive-value redaction, transaction boundaries, idempotency keys for critical endpoints. Redis optional for sessions, queues/rate limit; BullMQ optional for OCR/PDF/notifications. Nginx TLS reverse proxy; dedicated Unix service user and systemd/PM2 with restricted permissions. Private document storage outside web root, ideally S3-compatible with separate credentials and server-side encryption. All downloads through authorized, audited streaming endpoints. Malware scanning and content sniffing before file release. Queued document conversion isolated from the main API.

## 6. Repository skeleton
nonpapercoop/
  apps/web/public/index.html
  apps/web/public/assets/css/{tokens.css,layout.css,components.css}
  apps/web/public/assets/js/{app.js,api.js,auth.js}
  apps/web/public/pages/{dashboard,documents,inbox,outbox,workflow,approvals,signing,meetings,reports,admin}/
  apps/api/src/{app.js,server.js,config,db,middleware,modules,workers,utils}/
  apps/api/src/modules/{auth,users,organization,documents,registry,templates,workflows,signatures,meetings,finance-docs,procurement,member-docs,repository,search,notifications,reports,audit,admin}/
  database/migrations/
  database/seeds/test/
  tests/{unit,integration,e2e,security,fixtures}/
  infra/{nginx,systemd,backup,restore,monitoring}/
  docs/{architecture,api,security,runbooks,uat,decisions}/
  .github/workflows/{ci.yml,security.yml}/
  .env.example
  package.json
  package-lock.json
  README.md
Do not store actual secrets in repository; .env.example uses placeholders.

## 7. MySQL 8 logical data model
Use InnoDB, utf8mb4_unicode_ci (or tested Thai-compatible collation), UTC DATETIME(6) and display Asia/Bangkok. IDs can be BIGINT primary keys internally and UUID/ULID public identifiers. Use foreign keys and unique indexes, never cascade-delete signed documents. Record actor, timestamps and optimistic version for mutable business objects.

Identity:
users(id, public_id, username, email, password_hash, status, mfa_enabled, created_at, updated_at)
roles(id, code, name); permissions(id, code); role_permissions(role_id, permission_id); user_roles(user_id, role_id, scope_department_id); departments(id, parent_id, code, name); delegation_grants(id, grantor_id, grantee_id, permission_scope, starts_at, expires_at, approval_reference).

Documents & files:
document_types(id, code, name, classification_default, sequence_policy_id)
documents(id, public_id, type_id, title, subject, owner_department_id, created_by, classification, status, current_version_id, workflow_instance_id, effective_at, retention_policy_id, version_lock, created_at, updated_at)
document_versions(id, document_id, version_no, metadata_json, content_hash, created_by, created_at, is_released)
document_files(id, document_version_id, object_key, original_name, media_type, byte_size, sha256, scan_status, encrypted, uploaded_by, created_at)
document_acl(id, document_id, principal_type, principal_id, permission, expires_at)
document_links(id, source_document_id, target_document_id, relation_type)
document_registers(id, document_id, registry_type, register_year, sequence_no, display_number, assigned_at, assigned_by, UNIQUE(registry_type,register_year,sequence_no), UNIQUE(document_id,registry_type))
sequence_counters(id, registry_type, register_year, last_value, UNIQUE(registry_type,register_year))
document_distributions(id, document_id, recipient_type, recipient_id, sent_at, acknowledged_at, status)

Workflow:
workflow_definitions(id, code, version, status, definition_json, created_by, published_at, UNIQUE(code,version))
workflow_instances(id, document_id, definition_id, state, started_by, started_at, finished_at)
workflow_tasks(id, instance_id, step_key, assignee_id, assignee_role_id, state, due_at, action_at, version_lock)
workflow_actions(id, task_id, actor_id, action, comment, metadata_json, created_at)
workflow_delegations(id, from_user_id, to_user_id, scope, starts_at, ends_at)

Signature and governance:
signature_events(id, document_version_id, signer_id, purpose, auth_method, signature_method, document_sha256, evidence_object_key, signed_at, verification_status)
meetings(id, title, starts_at, location, classification, status)
meeting_attendees(id, meeting_id, user_id, role, attended_at, conflict_declared)
meeting_agendas(id, meeting_id, ordinal, title, document_id, confidentiality)
meeting_resolutions(id, agenda_id, resolution_text, voting_summary_json, approval_status, approved_at)

Repository & administration:
retention_policies(id, code, years, disposal_rule, legal_basis_note)
legal_holds(id, document_id, reason, status, created_by, created_at, released_at)
disposal_requests(id, document_id, requested_by, approved_by, status, executed_at)
templates(id, code, version, template_object_key, status, published_at)
notifications(id, user_id, event_type, target_public_id, read_at, created_at)
audit_events(id, event_id, actor_id, session_id, action, resource_type, resource_public_id, result, ip_masked_or_hash, reason_code, occurred_at, chain_hash)
outbox_events(id, event_type, payload_json, state, attempts, next_attempt_at, created_at)

Add domain-specific tables: finance_document_packets, procurement_packets, member_document_requests, classifications, numbering_policies, security_sessions, mfa_recovery_codes, failed_login_events, webhook_deliveries and system_settings.
Critical indexing: documents(owner_department_id,status,created_at), documents(classification,status), workflow_tasks(assignee_id,state,due_at), document_files(document_version_id), audit_events(occurred_at,actor_id), full-text index or dedicated permission-aware search service. JSON fields require schema validation.

## 8. API specification (versioned: /api/v1)
All APIs return {success, data, meta, error:{code,message,details}, requestId}, with HTTP status appropriately set; never leak internals. List endpoints support page/pageSize with caps, sortable allowlist and filter allowlist.
Auth: POST /auth/login; POST /auth/mfa/verify; POST /auth/logout; GET /auth/me; POST /auth/password/change; POST /auth/password/reset/request (non-enumerating); POST /auth/session/revoke.
Org/users: GET /users; POST /users; GET/PATCH /users/:id; GET /roles; GET /departments; POST /delegations.
Documents: GET/POST /documents; GET/PATCH /documents/:id; POST /documents/:id/submit; POST /documents/:id/revisions; GET /documents/:id/versions; POST /documents/:id/files; GET /documents/:id/files/:fileId/download; POST /documents/:id/cancel; GET /documents/:id/timeline; POST /documents/:id/distribute; POST /documents/:id/acknowledge.
Registry: GET /registries; POST /registries/assign-number; GET /registries/:id. Assign number once using DB transaction and counter row lock; idempotency key mandatory.
Workflows: GET /workflows/definitions; POST /workflows/definitions; POST /workflows/definitions/:id/publish; GET /tasks/my; POST /tasks/:id/approve; POST /tasks/:id/reject; POST /tasks/:id/return; POST /tasks/:id/delegate. All actions server-authorized and version-checked, with transaction and immutable event history.
Signature: POST /documents/:id/signing/request; POST /documents/:id/signing/confirm; GET /documents/:id/signatures; GET /documents/:id/verify. Confirmation requires fresh authentication or step-up MFA; reject stale/changed version hashes.
Meetings: CRUD /meetings; CRUD /meetings/:id/agendas; POST /meetings/:id/attendance; POST /meetings/:id/resolutions; POST /meetings/:id/minutes/publish.
Repository: GET /repository/search; GET /repository/folders; POST /repository/retention/requests; POST /repository/holds; POST /repository/disposal/requests.
Reports: GET /reports/overview; GET /reports/approval-sla; GET /reports/registry; POST /reports/exports.
System: GET /health/live; GET /health/ready (restricted diagnostics); GET /admin/audit; GET /admin/settings; PUT /admin/settings.
No public document/file endpoint by default. All requests include anti-CSRF defenses for cookie auth; use opaque session cookies and strict CORS/same-origin by default. Apply idempotency to critical POST requests and server-side enforcement on state transitions.

## 9. UX / Thai localization
Responsive desktop-first back-office with mobile approval views. Shell: logo, top bar, role/department switcher if authorized, notifications, sidebar and breadcrumbs. Screens: dashboard, personal inbox, received/sent registers, document editor, attachment manager, document preview, workflow timeline, task queue, signature center, meetings, repository search, reports, admin security. Thai language and Buddhist Era displays; store Gregorian ISO/UTC internally. Accessibility WCAG 2.2 AA target: full keyboard navigation, focus states, ARIA labels, non-color-only statuses, sufficient contrast, responsive tables, sensible form errors. Use Thai typography and print templates suitable for A4, with PDF fonts embedded. Consistent statuses: Draft, In Review, Returned, Rejected, Approved, Signed, Registered, Archived. Show user-friendly actionable error messages, never raw SQL errors. jQuery must avoid XSS by .text(), safe DOM methods; no untrusted HTML insertion.

## 10. Threat model and mandatory controls
Use OWASP ASVS 5.0 L2 as baseline target; map evidence to requirements. Protect against IDOR/BOLA, XSS including DOM-based XSS, SQL injection, CSRF, SSRF, clickjacking, malware uploads, path traversal, insecure deserialization, session fixation, brute force, privilege escalation, replay, workflow bypass, double approval, e-signature impersonation, secret exfiltration and ransomware.
- MFA for privileged, signer and high-risk approvals; step-up for signing, high-risk exports.
- Passwords hashed with Argon2id (tuned), secure reset tokens, rate limits, uniform login errors.
- Server-side sessions with HttpOnly Secure SameSite cookies and CSRF tokens; rotate session on login/privilege changes; revoke sessions.
- Server-side validation, parameterized SQL, output encoding, restrictive CSP, Helmet, strict allowlisted external links.
- Restrict CORS, no wildcard credentials, secure HTTPS TLS, HSTS when deployment ready.
- Every object/file access checks ACL, classification, department scope, legal hold and state.
- Uploads: extension/media-type allowlist, magic-byte validation, max size, filename normalization, AV scan, non-public quarantine, never execute uploaded files, PDF conversion in sandbox.
- Logs: append-only/tamper-evident audit, timestamps, actor, reason, correlation ID; redact tokens, credentials and sensitive document contents; separate operational vs security logs.
- Database: dedicated least-privilege app user; migration account used only by CI in TEST; restricted 3306 and Redis; encrypted backups + offsite copy; recovery exercises.
- VPS: dedicated instance, SSH key only, non-root deployment, UFW deny-default, Fail2ban, patch management, Nginx, firewall, monitoring, alerts.
- SAST, dependency/license scanning, secret scanning, unit/integration/E2E, authz matrix, DAST against TEST only.
- Privacy: data inventory, DPIA as applicable, privacy notices, purpose limitation, data subject request workflow, retention & legal holds.
- Thai electronic transaction and signature legal applicability to be reviewed by authorized counsel and cooperative officers; do not declare mere signature images legally sufficient.

## 11. Safety-isolation and TEST deployment requirements
Dedicated VPS only. Example `/srv/nonpapercoop-test` and `nonpapercoop_test` DB; own Unix user, secrets, DNS and TLS; *no* credentials to production; no network route or firewall egress to old production databases or private services. EXAMPLE subdomain `test.nonpapercoop.example` is placeholder, never silently assume ownership or DNS. Explicit allowlist for deployment target host and DB; deny commands if environment ID mismatch. `NODE_ENV=test`, `APP_ENV=test`, `ALLOW_PRODUCTION_MUTATIONS=false`. Never use `DROP DATABASE`, `TRUNCATE`, or blanket `DELETE` against non-disposable DB. CI uses isolated disposable test DB, seeded fictitious members. Provide backup and rollback before test releases. Production NonPaperCoop only in a separate future phase, after explicit approval and independently validated acceptance.

## 12. Development phases and gates
P0: requirements catalog, document taxonomy, roles-permissions matrix, data classification, workflow matrix, UI design tokens, ERD, threat model, acceptance test scenarios. Gate: stakeholder sign-off of specifications.
P1: repository scaffold, local Docker Compose for TEST/dev only, API foundation, auth/MFA, user/org master data, audit, CI. Gate: reproducible setup, tests and role matrix pass.
P2: document CRUD, safe file handling, numbering, inbound/outbound registers, version control, Thai templates. Gate: numbering concurrency and integrity tests pass.
P3: approval workflow sequential/parallel, delegation, deadlines, maker-checker, notifications, task UI. Gate: invalid transitions and double approval tests pass.
P4: signing evidence, integrity verification, publication/archival, retention/legal hold and meeting management. Gate: signing integrity, access security and governance UAT pass.
P5: finance/procurement/member documents, repository full-text search, analytics, reports. Gate: confidentiality/export/search ACL tests pass.
P6: penetration test (authorized TEST only), backup restoration, load tests, accessibility/compatibility, disaster recovery drills, UAT signoffs. Gate: no open Critical/High findings, documented exceptions for Medium/Low, test results and rollback evidence.
P7: prepare change request and independent NEW NonPaperCoop production environment; DO NOT deploy until human explicitly approves.

## 13. Mandatory acceptance scenarios
1. Anonymous requests to file URLs return 401/403 with no content.
2. User from Department A cannot read protected Department B document even by guessing ID or via search, thumbnail, export, attachment endpoint.
3. Maker cannot approve own controlled packet, including delegated identities and race conditions.
4. Two concurrent numbering requests issue distinct numbers in the same year/registry, with idempotent retry returning same result.
5. Two parallel approvers cannot bypass state/version checks; transactions handle races safely.
6. Signed document hash mismatch causes verification failure and no silent modification of original.
7. Rejected/returned documents show complete trace and new revision on resubmission.
8. Malware or script upload is quarantined/rejected; uploaded content cannot run as code.
9. CSRF, XSS and SQLi regression suite passes.
10. Audit log records create/edit/view/download/approve/sign/export and privileged actions without exposing document contents.
11. Backup and restore are verified in independent test restore target; RPO/RTO documented and accepted.
12. UI mobile/desktop, Thai fonts, Buddhist Era display, PDF print, keyboard flows meet agreed UAT criteria.
13. All previous production services remain unchanged; no old production database calls or shared filesystem access.

## 14. Required deliverables
- docs/requirements/BRD.md, SRS.md, roles-permissions-matrix.md, document-types.md, workflow-matrix.md
- docs/architecture/ARCHITECTURE.md, ERD.md, ADRs, data-flow.md
- docs/security/THREAT-MODEL.md, ASVS-MATRIX.md, DEPLOYMENT-ISOLATION.md, PDPA-DATA-INVENTORY.md
- docs/api/openapi.yaml; endpoint request/response examples
- database/migrations and anonymized seed fixtures
- runnable frontend and API, test fixtures, package-lock.json
- tests with test evidence and CI workflow
- docs/runbooks/TEST-DEPLOY.md, BACKUP-RESTORE.md, INCIDENT-RESPONSE.md, ROLLBACK.md
- docs/uat/UAT-CHECKLIST.md, UAT-RESULTS.md, RELEASE-GATE.md
- README with environment setup, example accounts generated safely during setup, screenshots only when actually captured

## 15. Definition of done / reporting format
Each work item must report: changed files, database migrations, APIs, UX screens, security considerations, tests executed, real stdout/evidence, remaining risks and rollback procedure. Use PASS/FAIL/BLOCKED/NOT RUN accurately. When unable to execute a test, clearly say NOT RUN. Never say production ready until all gates and authorized signoffs complete. The coding agent should execute P0 then P1 without production access and pause any irreversible external action for authorization.

## 16. Suggested initial working command to the agent
'Begin NonPaperCoop P0 and P1 in a new repository/environment only. Create the complete docs, ERD, RBAC matrix, API OpenAPI, UI skeleton, MySQL migrations, secure login/MFA architecture, audit baseline, seeded fictional data, tests, and TEST deployment instructions. Execute locally verifiable tests and show results. Do not access any legacy production resource, never silently deploy, and record all blocked tasks.'

## 17. Standards references to validate during implementation
- OWASP ASVS 5.0: https://asvs.owasp.org/
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Node release schedule: https://github.com/nodejs/Release
- Thai e-transactions and PDPA: confirm against current official legal sources with qualified review before go-live.
