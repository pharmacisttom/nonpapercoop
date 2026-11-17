# ASVS 5.0 L2 workstream mapping

Draft workstream mapping; not a complete control-by-control ASVS assessment or certification.

| Area | Evidence | Status |
|---|---|---|
| Auth | claims + mock-provider HTTP | partial; live Google pending |
| Sessions | rotation/revoke/absolute expiry, hash store | partial; DB/idle/races pending |
| Authorization | role/owner negative tests | partial; full ABAC pending |
| Validation/encoding | bound SQL/strict schemas/text rendering | baseline |
| API/CSRF | Origin/CSRF negatives, safe errors | baseline |
| Audit/privacy | transactional events, no Google token persistence | partial; tamper evidence/retention pending |
| File/signature | unavailable | not implemented |
| Deployment | config guards, templates | no deployment verified |

Security owner must map exact ASVS IDs and independent evidence, close all Critical/High findings before any future production proposal.
