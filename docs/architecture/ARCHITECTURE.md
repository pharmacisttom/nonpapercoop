# Architecture — TEST0.2

Express modular monolith serves HTML/jQuery with self-hosted Noto Sans Thai, DataTables and SweetAlert2. Authentication claims are separated from local authorization. app.js handles middleware/session/CSRF/login; modules/routes.js validates REST inputs with Zod and delegates to enterprise.js, policy.js, storage.js and deadlines.js. repository.js owns transaction/base identity primitives and append-only auth audit. No test verifier is imported by server.js.

Every business mutation locks/reloads active user/session_version, authorizes the record, checks state/version, writes domain changes and audit in one transaction. Record/counter/task row locks and scoped idempotency keys prevent duplicate critical actions. Transient SQL deadlocks retry transaction at most three times. Failed audit rolls back mutation.

Identity uses Google sub uniquely; email cannot switch identity. Roles include global primary role plus scoped grants, department/group membership and explicit ACL. Owner/department/ACL policy applies uniformly to list/search/download. Admin has no general read bypass. Readonly auditors cannot mutate business records. Recent Google token is not MFA proof; high-risk records fail closed without a reviewed external assurance policy.

Document metadata/revisions/files form a frozen SHA256 evidence set. AES256-GCM file objects use opaque keys outside public/. Malware scanning is loopback ClamAV INSTREAM. Missing/failed scanner leaves quarantine; signed originals cannot be edited. Signature evidence records intent/current digest/session reauth time; no certificate signature/TSA claim. Registry year uses Bangkok calendar with BE display.

Workflow instances snapshot published definitions, create sequential/parallel tasks, enforce maker-checker across assignment/delegation, and preserve actions. Returned documents create new revision on editing. Deadline worker sends only permission-protected in-app notices to assignee/owner; never changes assignee, auto-approves or sends external messages.

Meetings are visible only to owner/invitees; attached documents retain their independent ACL. Quorum and voting rule are explicit input, conflicts remove voting eligibility. Retention/holds/disposal approvals preserve records; physical disposal is unavailable without separately authorized execution.

Business domain_events form a serialized hash chain with an append-only runtime grant; head updates share the transaction. This is local tamper evidence, not externally anchored immutability. Authentication/operational audit is separate append-only baseline. Keys, test datadirs/backups and account evidence are ignored by Git.

CI is TEST-only on fresh MySQL8 service with restricted runtime grants. Local SQL/restore evidence is MariaDB compatibility only. Deployment templates are not deployment evidence. See module status/release gate for unsupported advanced scope and external acceptance work.
