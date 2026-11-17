# Verified TEST administrator enrollment

Unknown Google accounts remain denied. After Google signature/claims validation, the backend records only sub, verified email and verification timestamp in verified_access_requests. It stores no ID/access token and creates no user or session. Existing mapped suspended/revoked accounts cannot enroll again to regain access.

Migration002 is additive and requires an encrypted pre-change backup and reviewed TEST target. Runtime grants: SELECT/INSERT/UPDATE on verified_access_requests. No public request-list or approval endpoint exists. Request retention/purge requires a reviewed policy; this table is personal identity data, not document/member fixtures.

Initial admin process:

1. An authorized operator explicitly approves the exact TEST email and role. This does not automatically approve other Google accounts.
2. User signs in with Google on the TEST app. First sign-in remains denied while verified subject evidence is recorded.
3. Operator checks exactly one matching verified identity from the past30 minutes. Ambiguous/missing evidence fails closed. No admin may already exist.
4. Run `node --env-file=.env scripts/bootstrap-verified-admin.mjs` with TEST_BOOTSTRAP_APPROVED=true and approved TEST_ADMIN_EMAIL supplied in process environment. Repository transaction locks the candidate, creates user+unique Google mapping and appends bootstrap audit atomically. No browser-supplied email/sub is trusted as evidence.
5. User signs in again; only now can the active subject obtain a session. Further user approval uses audited admin UI with reauthentication.

For this session, the user explicitly selected the explicitly approved TEST email as TEST administrator. Approval may proceed only once its Google-verified request is available; do not fabricate Google sub. Stakeholder dual-control review beyond the user's approval is not claimed.

Rollback: restore previous application files and restart only verified TEST process; leave additive request table and audit intact. To revoke a created admin, suspend the exact user and increment session_version under audited operator control. Do not delete identity/audit or restore old session privileges. Encrypted pre002 backup is retained under ignored .local. No production change.

QA: artifacts/enrollment-tests.txt reports29 passing Node26 unit/HTTP tests, including unknown identities creating request only and invalid claims creating no request. Live sign-in/approval status must be reported separately.
