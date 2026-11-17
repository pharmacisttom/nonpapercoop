# Implemented ERD — TEST0.2

Canonical SQL is migrations001–004 (39 tables on the executed local target). The diagrams show domain relationships, not every column. All mutable state uses InnoDB transactions; no cascade-delete of released records.

```mermaid
erDiagram
 USERS ||--o| GOOGLE_IDENTITIES : mapped_by_subject
 USERS ||--o{ USER_GRANTS : additional_scoped_roles
 USERS ||--o{ DEPARTMENT_MEMBERSHIPS : belongs
 DEPARTMENTS ||--o{ DEPARTMENT_MEMBERSHIPS : members
 USERS ||--o{ GROUP_MEMBERSHIPS : belongs
 ORGANIZATION_GROUPS ||--o{ GROUP_MEMBERSHIPS : members
 USERS ||--o{ DOCUMENTS : owns
 DOCUMENTS ||--|| DOCUMENT_CONTROLS : lifecycle_classification
 DOCUMENTS ||--o{ DOCUMENT_REVISIONS : immutable_metadata
 DOCUMENTS ||--o{ DOCUMENT_FILES : encrypted_objects
 DOCUMENTS ||--o{ DOCUMENT_ACL : explicit_user_access
 DOCUMENTS ||--o{ DOCUMENT_GROUP_ACL : explicit_group_access
 ORGANIZATION_GROUPS ||--o{ DOCUMENT_GROUP_ACL : grantees
 USERS ||--o{ REPOSITORY_FOLDERS : private_folders
 REPOSITORY_FOLDERS ||--o{ REPOSITORY_FOLDERS : parent
 REPOSITORY_FOLDERS ||--o{ DOCUMENT_FOLDERS : contains
 DOCUMENTS ||--o{ DOCUMENT_FOLDERS : indexed_by_owner
 DOCUMENTS ||--o{ WORKFLOW_INSTANCES : processed_by
 WORKFLOW_DEFINITIONS ||--o{ WORKFLOW_INSTANCES : immutable_snapshot
 WORKFLOW_INSTANCES ||--o{ WORKFLOW_TASKS : steps
 WORKFLOW_TASKS ||--o{ WORKFLOW_ACTIONS : immutable_decisions
 DOCUMENTS ||--o{ SIGNATURE_EVENTS : digest_bound_intent
 DOCUMENTS ||--o{ DOCUMENT_REGISTERS : uniquely_numbered
 DOCUMENTS ||--o{ DOCUMENT_DISTRIBUTIONS : sent_to_users
 DOCUMENTS ||--o{ LEGAL_HOLDS : blocks_disposal
 DOCUMENTS ||--o{ DISPOSAL_REQUESTS : reviewed_request
```

```mermaid
erDiagram
 MEETINGS ||--o{ MEETING_ATTENDEES : invited_users
 MEETINGS ||--o{ MEETING_AGENDAS : agendas
 DOCUMENTS ||--o{ MEETING_AGENDAS : independent_acl_attachment
 MEETING_AGENDAS ||--o{ MEETING_VOTES : unique_voter
 USERS ||--o{ MEETING_ATTENDEES : attends
 USERS ||--o{ MEETING_VOTES : eligible_vote
 USERS ||--o{ NOTIFICATIONS : in_app_only
```

Additional tables: sessions (hashed random lookup IDs, no Google tokens); auth_nonces (one-use replay guard); verified_access_requests (verified subject/email, no automatic approval); idempotency_keys (actor+scope+key); sequence_counters (type+Gregorian Bangkok year); document_templates (code+version); retention_policies (explicit years/basis); audit_events (append-only auth/base events); domain_events and domain_audit_head (serialized local hash chain).

Files are private encrypted objects, not BLOBs. Runtime DB account cannot modify revisions/actions/signatures/domain events. Storage keys/backups are not in Git. UTC DB timestamps; frontend displays Thai/Buddhist Era dates in Asia/Bangkok. Restore evidence validates all39 SQL tables; it does not establish file-object/offsite recovery.
