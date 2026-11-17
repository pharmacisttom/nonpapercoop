# Effective role and resource policy — TEST0.2

| Capability | Required authority |
|---|---|
| Admin user allowlist/status/roles/revoke | Global system_admin plus recent reauth for mutation; no self role/status/grant escalation |
| Departments/groups/membership | org:manage, recent reauth; scoped role does not become global administration |
| Create own metadata documents | document:create in chosen department, department membership for department-owned record |
| Read/search/download | Owner, explicit user/group ACL, or internal same-department membership; never blanket admin access |
| Edit draft/returned | Resource write ACL/owner plus an applicable non-auditor role; version match; signed/released state immutable |
| Approve/reject/return/delegate | Current assigned pending task, valid record access/scope/state/version, different maker, recent assurance; high-risk blocks without policy |
| Sign | Write authority, approved then signing_pending, deliberate intent, fresh assurance, exact current metadata/files digest |
| Registry | registry:assign in record scope, read authority, signed digest, recent assurance, idempotency/counter transaction |
| Archive/holds/disposal requests | retention:manage in record scope plus read authority/reauth; disposal requires expiry/no hold and different reviewer |
| Meetings | Creator permission/owner for organization; explicit invited attendee and attendance/no conflict for votes |
| Audit | audit:read; nonsecurity/system auditors restricted to readable document events |
| Export | Only visible records; sensitive records require unavailable high assurance and therefore remain blocked |

Role codes/permissions live in modules/policy.js and capabilities API. UI uses capabilities for affordances; backend remains authoritative. A system administrator may create own documents/meetings but does not automatically read another owner's confidential material or approve own packet. Revoked grants/status invalidate sessions. High-risk policy and stakeholder grants still need review before broader acceptance.
