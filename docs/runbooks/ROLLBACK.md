# Rollback

P0: preserve both input Blueprints. Review file manifest; revert only newly created tracked implementation/docs changes using version control after recording current changes. No external P0 state exists.

P1 code: stop only the NonPaperCoop TEST app service/process, retain logs/evidence, switch `current` to the prior tested release/lockfile, reinstall using npm ci and re-run health/auth smoke checks. Do not route any traffic to legacy services. Record release hashes and operator/time.

Database: schema 001 is additive, no destructive down migration is provided. MySQL DDL is not transactional. On migration failure stop rollout and inspect only dedicated TEST schema; do not repeat blindly. Restore verified encrypted pre-change backup into a **new isolated restore instance**, validate schema/counts/checksums/grants, then point only TEST app at it after review. Never drop/truncate shared data or overwrite old systems. Do not roll back audit history or identity revocations to bypass security.

Local instance: stop the verified private server through local admin SHUTDOWN after validating port/datadir; retain `.local/mariadb-test`, credentials and backups for inspection. No recursive deletion needed. App source uses no shared XAMPP datadir. Revoke test access/version if credentials/session keys are compromised; rotate new TEST secrets and require reauthentication.

No Production deployment occurred, so no Production rollback was required/performed. Recovery drill results belong in artifacts and UAT report; instructions are not evidence of a successful restore.

## v0.2 rollback boundary

Pre003 and pre004 encrypted backups/keys remain under ignored .local. New code can be reverted independently of additive domain tables. Retain domain_events, signature_events and historical workflow actions even if reverting UI. A previous v0.1 app does not understand released lifecycle controls; do not re-enable its mutation routes against released/signed records without review. Prefer maintenance/read-only mode and roll forward fixes. No destructive down migration is included.

To inspect a database rollback, restore a pre-change encrypted dump to a new instance and verify all table hashes/grants before pointing only TEST at it; do not restore old sessions/privileges to evade revocation. Current39-table restore evidence is artifacts/enterprise-restore.json. Actual file-object/key recovery and RPO/RTO approval remain separate tasks.
