# TEST deployment — template, not executed

1. Record new VPS identity/owned TEST domain and independently verify no legacy mounts, secrets or network routes. No scanning old systems. Use a new Unix account, TLS certificate, OAuth client, DB and backup encryption key.
2. Install supported Node26 LTS/MySQL8; firewall MySQL loopback only, inbound 443/SSH key-only, restricted egress for Google verification/approved package sources. OS patch/hardening review required.
3. `npm ci --ignore-scripts`; set protected environment from .env.example. Never use placeholder secrets. `COOKIE_SECURE=true` and actual HTTPS APP_ORIGIN required on VPS.
4. Review 001 SQL on an empty dedicated nonpapercoop_test database, take pre-change backup if any data exists, obtain DBA approval. No auto migrations/down migration. Runtime account: SELECT/INSERT/UPDATE on users/google_identities/documents/auth_nonces, SELECT/INSERT only on audit_events, SELECT/INSERT/UPDATE/DELETE on sessions. No global privileges/DDL/audit deletion.
5. Set DB/server timezone UTC. Bootstrap approved TEST admin sub/email under dual review via CLI; never seed an invented real identity. Complete GIS setup in ADR-001.
6. Install reviewed systemd and Nginx templates substituting actual new TEST paths/certificates/domain. Node binds loopback. Run `nginx -t` before activating only new TEST config. Do not reload or modify any legacy production server.
7. Execute syntax/unit/HTTP/MySQL/real-Google/TLS/E2E/security and restore suites. Record versions, commit, results and failed/blocked checks. CI definition existing is not proof of a CI run.
8. Admit fictitious UAT users only after owner approval. This runbook does not authorize deployment to Production.

## Local XAMPP-derived instance actually created

Uses only C:\xampp\mysql binaries; separate `.local/mariadb-test`, loopback **33307**, no Windows service/shared XAMPP config or datadir. Engine is MariaDB 10.4.32, not MySQL8. Secrets are in ignored `.local/db-secrets.json`; protect folder permissions, never commit/share contents. It is a local compatibility target only, not a VPS or production candidate.

`node scripts/local-db-init.mjs` refuses an existing datadir. `node scripts/local-db-migrate.mjs` checks exact port/datadir and refuses existing schema. Its narrowly scoped `--resume-users-only` recovery verifies only an empty users table before collation correction; do not generalize it to used databases. `npm run test:local-db` uses only these newly generated credentials. Database is retained for review; no DROP/TRUNCATE or fixture removal performed.

## Enterprise schema/runtime grants (v0.2)

Apply reviewed migrations001–004 in order on an independent TEST DB after backup. Tables document_revisions, workflow_actions, signature_events, domain_events and meeting_votes receive SELECT/INSERT only; audit_events also SELECT/INSERT. domain_audit_head receives SELECT/UPDATE only. Mutable domain tables receive SELECT/INSERT/UPDATE. Exact membership/ACL/folder-link junctions and sessions may receive DELETE for scoped revocation; no other table removal or global DDL privileges. See ci-migrate.mjs for the table grant matrix; that script is gated to empty CI only and must not be repurposed for a used VPS database.

Generate STORAGE_KEY as new32-byte base64 secret and retain separately from encrypted objects. Never commit .env/keys/datadirs. Run clamd on loopback3310 with maintained signatures and suitable stream size/time limits; without it files remain quarantined. Configure monitored NTP before accepting signing times. Existing signing evidence is not a TSA/certificate signature.

Local migrations003/004 executed on port33307 with encrypted pre-change backups. Enterprise restore39 tables into a new datadir/33308 succeeded and stopped the restore server; database rows only, not offsite/file recovery proof. TEST app continues on3100. No VPS/Production deployment has been performed.
