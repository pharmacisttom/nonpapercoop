# TEST module status — 2026-11-17

| Domain | Implemented in source/TEST | Boundary or remaining acceptance |
|---|---|---|
| Identity | Google verification, approved subject binding, sessions/revoke/CSRF, recent reauth | No fallback login; no assertion of provider MFA; manual controlled recovery |
| Organization | Departments, memberships, groups, scoped multi-role grants, individual/group ACL | Delegated business authority outside task delegation needs approved policy |
| Documents | Metadata/content/tags/domain packets, revisions, soft-delete drafts, owner/ACL/department scoping | Full rich-text authoring and OCR/conversion not implemented |
| Files | PDF/TXT only, 10MiB, encrypted private storage, ClamAV protocol, quarantine, protected download and tamper detection | Live ClamAV/signatures/OS sandbox not provisioned locally; other office formats not supported |
| Workflow | Definition versions/publish, sequential/parallel all/any, assignments, return/reject/delegate/cancel, maker-checker/version/idem, deadline notifications | No visual arbitrary-flow designer; escalation not auto-approval; external email not enabled |
| Registry | Inbound/outbound/internal numbers, Bangkok year/BE display, counter locking and idempotency, distribution/acknowledgement | Requires signed evidence before numbering; configurable custom number formats still pending |
| Signing | Explicit intent, fresh identity, content/files SHA256, version lock, immutable event, verification | No certificate/PAdES/TSA/NTP assurance/legal approval; high-risk actions blocked |
| Meetings | Date/invitees, configurable quorum/rule, conflict declarations, votes, resolutions, minutes | Bylaw policy and human UAT required; no guessed statutory values |
| Finance/procurement/member | Permission-protected typed metadata packets and attachments; standard workflow/storage | No accounting integration, payments or public member portal; watermark/redaction service pending |
| Repository | Permission-filtered title/content search, tags, hierarchical private folders, templates | No OCR/full-text engine or shared hierarchical taxonomy administration |
| Retention | Configured years/basis, archive, legal holds, maker-checker disposal requests | No physical destruction until separately approved; retention policy requires stakeholder review |
| Reporting | Scoped dashboard, task overdue metrics, protected CSV (max200), browser A4 print/PDF | Batch PDF/CSV export jobs and full SLA analytics not implemented |
| Audit | Append-only grants, transactional business events, local hash chain, restricted viewer | No external immutable anchor; authentication events remain separate append-only baseline |
| UI | Thai self-hosted font, navigation, responsive cards/tables, DataTables, central SweetAlert2 forms/actions | Full screen-reader/browser matrix/Bootstrap/Select2 interoperability UAT pending |
| Operations | TEST templates, additive migrations, encrypted local backup/restore, CI definition | New dedicated VPS/HTTPS/offsite/file recovery and independent penetration/load/UAT not completed |

This is a working TEST implementation, not a claim that every Blueprint requirement or release gate is complete. External services, legal/bylaw review and human acceptance cannot be fabricated by code. Keep Production closed.
