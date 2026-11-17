# TEST data inventory

| Data | Purpose/storage | Control |
|---|---|---|
| Approved Google sub/email | users/google_identities; identity | admin-only allowlist, no self-registration |
| Session/CSRF/auth time | server sessions; auth security | hashed ID, TTL, revoke; no ID/access tokens |
| Draft title/category | documents; prototype | fictitious only, owner checks |
| Actor/action/target/time | audit_events; accountability | transactional insert; no runtime update/delete |

No real member/finance records. Retention periods, legal basis, privacy notices, subject rights, legal holds and DPIA need authorized review. No legal compliance assertion. Expired-session/nonce retention cleanup requires reviewed narrowly scoped procedure.
