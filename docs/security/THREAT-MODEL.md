# Threat model — draft

| Threat | Control/evidence | Remaining |
|---|---|---|
| Forged/replayed identity | Google verifier, claim tests, nonce unique insert | Live keys/provider/DB concurrency |
| CSRF/login CSRF | exact Origin + session CSRF, negative HTTP tests | Real HTTPS GIS browser |
| Session fixation/theft | regeneration, HttpOnly/Secure, hash lookup, version revoke, TTL | In-flight logout races and idle/load tests |
| IDOR/BAC | owner-only drafts, admin not superuser, RBAC tests | Department/classification/delegation ABAC |
| SQLi/mass assignment | parameters, strict Zod, tests | Real MySQL security regression |
| DOM XSS | DOM text construction, CSP, malicious-title browser test | Complete SAST/DAST/accessibility |
| Lost/modified audit | transactional write, insert-only grants | Chain hash/external immutable log |
| Malware/upload | no endpoint | P2 quarantine/magic-byte/AV/encryption |
| Duplicate approval/number | no endpoint | P2/P3 locks/idempotency suites |
| Weak signing assurance | feature unavailable | Reviewed assurance, evidence, legal review |

Assets: identity mappings, sessions, authorization, metadata, audit. Adversaries include anonymous, unapproved Google account, malicious approved user, stolen session and compromised operator/dependency. npm audit is point-in-time dependency evidence, not penetration testing. No Production readiness claim.
