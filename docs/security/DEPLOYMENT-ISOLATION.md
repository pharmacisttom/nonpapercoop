# Isolation

Allowed work: new workspace sources, fictional local tests, public package/documentation endpoints. No deployment performed. Config permits test/development only; requires exact nonpapercoop_test DB/account and loopback MySQL. Secure cookies required outside loopback development. Guards do not prove physical infrastructure isolation.

Before TEST deployment record new VPS identity, owned hostname, separate credentials/storage/backup keys, no legacy mounts/routes/secrets, firewall egress limits, SSH key-only access, least-privilege user. Review new infrastructure configuration; do not probe old services. No old backups or personal records in TEST.

No automatic migrations, destructive schema scripts or production operations. All templates require review and target verification before execution.
