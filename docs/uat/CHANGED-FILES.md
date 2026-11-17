# Changed files — TEST0.2 delivery

- apps/api/src/modules/{enterprise,policy,schemas,routes,storage,deadlines}.js: domain services, scoped RBAC/ABAC, versioned workflow, signing/registry/meetings/retention, encrypted upload and deadline alerts.
- apps/api/src/{app,server,config,identity,repository,session-store}.js: Google-only sessions, verified allowlist/bootstrap, feature routing, runtime storage config, audit and reauthentication; no local credentials.
- apps/web/public/index.html and assets/css/{tokens,layout,theme}.css: modern Thai login and responsive enterprise shell, cards, DataTables, forms, focus/modal/mobile/print styling.
- assets/js/{app,enterprise-ui,core/alerts}.js: permission-driven module navigation and actual API integration; safe text/DOM creation, business-specific forms, consistent confirmation/loading/error handling and backend-confirmed success.
- database/migrations/003_enterprise_modules.sql and004_groups_folders.sql: additive enterprise schema; migrations001/002 retained. Pre-change backups encrypted privately; no DROP/TRUNCATE/destructive migration.
- tests/unit, integration, enterprise and e2e: claims/security/SQL/concurrency/integrity/quarantine/meetings/retention/group/folder/UI journeys, including reauthenticated signature evidence. Fixture verifier restricted to TEST harness, never runtime server.
- scripts: local guarded migration/bootstrap/check/restore, OpenAPI inventory, fresh CI migration and staged secret scanner. No auto production migration/deploy.
- infra and .github/workflows/ci.yml: independent TEST templates and disposable MySQL8/Chromium quality checks; no deployment workflow.
- docs and artifacts: actual sanitized stdout/JSON/screenshots/restore hashes and current module/readiness boundaries. Real account evidence and environment are excluded from Git.
- package.json/package-lock.json: exact versions including SweetAlert2 11.26.25, Multer, DataTables, Noto Sans Thai and dev tooling. Source marked private/UNLICENSED; dependency license inventory supplied.

Original supplied Blueprints retained unchanged. Remote origin set to user-supplied pharmacisttom/nonpapercoop. See delivery message/Git history for actual commit/push status; this file does not claim a remote run passed.

Rollback: stop only verified TEST process; revert code commit/release; keep additive schema/audits; for DB recovery restore encrypted backup to a new isolated datadir/port, never overwrite old systems. No real file disposal or Production action occurred.
