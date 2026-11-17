# Backup and restore exercise

Scope: new TEST instance only. Do not use/copy any production backup. DBA verifies host, port, database, @@datadir, disk space, target emptiness and approvals first. Freeze TEST writes during a consistency comparison.

1. Record source engine/version/schema checksum and row counts; use a separate read-only backup account, protected client config (never command-line password or log output).
2. Create transaction-consistent dump using `--single-transaction --skip-lock-tables --routines=false --triggers=false` for dedicated schema only. Do not dump mysql system accounts or other databases.
3. Encrypt backup with a separate key (AES-256-GCM/authenticated encryption or approved backup tooling); store key separately with restrictive permissions. Record ciphertext SHA-256, timestamp and size without plaintext secrets.
4. Provision a new restore instance/data directory/loopback port. Validate identity before import; restore into a new TEST-only database. Never overwrite source. Use migration/restore account, not runtime account.
5. Decrypt and authenticate; import only trusted TEST dump. Compare table definitions and canonical sorted row hashes/counts, FK integrity, role grants and audit records; run smoke tests. Corrupt ciphertext must fail authentication. Capture actual timing for RPO/RTO; business acceptance remains pending.
6. Retain encrypted backup, evidence and restore target until reviewed. No automatic disposal. Perform on MySQL8 even if local MariaDB compatibility drill succeeds.

Local drill executed with `node scripts/local-restore-drill.mjs`: encrypted backup restored into a separate datadir/port 33308, all six table row hashes matched, corrupted ciphertext was rejected, restore server stopped after test. Evidence: `artifacts/restore-drill.json`. Source kept running on private port 33307. Backup/key retained separately as files under ignored .local for review; this is not offsite key separation. No claimed RPO/RTO SLA until measured, reviewed and approved. MySQL8/VPS/offsite exercise remains pending.
