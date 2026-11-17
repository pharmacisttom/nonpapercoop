-- Additive only. Back up first; apply only on a verified independent TEST instance.
CREATE TABLE departments (
 id CHAR(36) PRIMARY KEY, code VARCHAR(30) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1, active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE department_memberships (
 user_id CHAR(36) NOT NULL, department_id CHAR(36) NOT NULL,
 PRIMARY KEY(user_id,department_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE user_grants (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, role_code VARCHAR(40) NOT NULL,
 department_id CHAR(36) NULL, granted_by CHAR(36) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
 FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE document_controls (
 document_id CHAR(36) PRIMARY KEY, department_id CHAR(36) NULL,
 classification VARCHAR(20) NOT NULL DEFAULT 'internal', state VARCHAR(40) NOT NULL DEFAULT 'draft',
 description TEXT NOT NULL, tags_json JSON NOT NULL, domain_json JSON NOT NULL,
 current_revision INT UNSIGNED NOT NULL DEFAULT 1, retention_until DATETIME(6) NULL,
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY(document_id) REFERENCES documents(id), FOREIGN KEY(department_id) REFERENCES departments(id), INDEX(state,classification)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO document_controls(document_id,classification,state,description,tags_json,domain_json)
 SELECT id,'internal',status,'','[]','{}' FROM documents;
CREATE TABLE document_revisions (
 id CHAR(36) PRIMARY KEY, document_id CHAR(36) NOT NULL, revision_no INT UNSIGNED NOT NULL,
 metadata_json JSON NOT NULL, sha256 CHAR(64) CHARACTER SET ascii NOT NULL,
 created_by CHAR(36) NOT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE(document_id,revision_no), FOREIGN KEY(document_id) REFERENCES documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE document_acl (
 document_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
 permission VARCHAR(20) NOT NULL, granted_by CHAR(36) NOT NULL,
 PRIMARY KEY(document_id,user_id,permission), FOREIGN KEY(document_id) REFERENCES documents(id), FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE document_files (
 id CHAR(36) PRIMARY KEY, document_id CHAR(36) NOT NULL, revision_no INT UNSIGNED NOT NULL,
 original_name VARCHAR(200) NOT NULL, media_type VARCHAR(80) NOT NULL, byte_size INT UNSIGNED NOT NULL,
 sha256 CHAR(64) CHARACTER SET ascii NOT NULL, object_key CHAR(36) NOT NULL UNIQUE,
 scan_status VARCHAR(20) NOT NULL, uploaded_by CHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY(document_id) REFERENCES documents(id), INDEX(document_id,revision_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE workflow_definitions (
 id CHAR(36) PRIMARY KEY, code VARCHAR(40) NOT NULL, version INT UNSIGNED NOT NULL,
 name VARCHAR(150) NOT NULL, definition_json JSON NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'draft',
 created_by CHAR(36) NOT NULL, UNIQUE(code,version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE workflow_instances (
 id CHAR(36) PRIMARY KEY, document_id CHAR(36) NOT NULL, definition_id CHAR(36) NOT NULL,
 definition_json JSON NOT NULL, current_step INT UNSIGNED NOT NULL DEFAULT 0,
 state VARCHAR(30) NOT NULL DEFAULT 'in_review', started_by CHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY(document_id) REFERENCES documents(id), FOREIGN KEY(definition_id) REFERENCES workflow_definitions(id), INDEX(document_id,state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE workflow_tasks (
 id CHAR(36) PRIMARY KEY, instance_id CHAR(36) NOT NULL, step_no INT UNSIGNED NOT NULL,
 assignee_id CHAR(36) NOT NULL, delegated_by CHAR(36) NULL, state VARCHAR(20) NOT NULL DEFAULT 'pending',
 version INT UNSIGNED NOT NULL DEFAULT 1, due_at DATETIME(6) NOT NULL,
 acted_at DATETIME(6) NULL, FOREIGN KEY(instance_id) REFERENCES workflow_instances(id), FOREIGN KEY(assignee_id) REFERENCES users(id),
 UNIQUE(instance_id,step_no,assignee_id), INDEX(assignee_id,state,due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE workflow_actions (
 id CHAR(36) PRIMARY KEY, task_id CHAR(36) NOT NULL, actor_id CHAR(36) NOT NULL,
 action VARCHAR(20) NOT NULL, reason VARCHAR(1000) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY(task_id) REFERENCES workflow_tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE idempotency_keys (
 actor_id CHAR(36) NOT NULL, scope VARCHAR(150) NOT NULL, idem_key VARCHAR(100) CHARACTER SET ascii NOT NULL,
 request_hash CHAR(64) CHARACTER SET ascii NOT NULL, response_json JSON NOT NULL,
 PRIMARY KEY(actor_id,scope,idem_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE sequence_counters (
 registry_type VARCHAR(20) NOT NULL, register_year INT NOT NULL, last_value INT UNSIGNED NOT NULL DEFAULT 0,
 PRIMARY KEY(registry_type,register_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE document_registers (
 id CHAR(36) PRIMARY KEY, document_id CHAR(36) NOT NULL, registry_type VARCHAR(20) NOT NULL,
 register_year INT NOT NULL, sequence_no INT UNSIGNED NOT NULL, display_number VARCHAR(80) NOT NULL,
 assigned_by CHAR(36) NOT NULL, assigned_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE(registry_type,register_year,sequence_no), UNIQUE(document_id,registry_type), FOREIGN KEY(document_id) REFERENCES documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE signature_events (
 id CHAR(36) PRIMARY KEY, document_id CHAR(36) NOT NULL, revision_no INT UNSIGNED NOT NULL,
 signer_id CHAR(36) NOT NULL, document_sha256 CHAR(64) CHARACTER SET ascii NOT NULL,
 intent VARCHAR(500) NOT NULL, evidence_json JSON NOT NULL,
 signed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE(document_id,revision_no,signer_id),
 FOREIGN KEY(document_id) REFERENCES documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE document_distributions (
 id CHAR(36) PRIMARY KEY, document_id CHAR(36) NOT NULL, recipient_id CHAR(36) NOT NULL,
 sent_by CHAR(36) NOT NULL, sent_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), acknowledged_at DATETIME(6) NULL,
 UNIQUE(document_id,recipient_id), FOREIGN KEY(document_id) REFERENCES documents(id), FOREIGN KEY(recipient_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE notifications (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, event_type VARCHAR(50) NOT NULL,
 document_id CHAR(36) NULL, read_at DATETIME(6) NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY(user_id) REFERENCES users(id), INDEX(user_id,read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE legal_holds (
 id CHAR(36) PRIMARY KEY, document_id CHAR(36) NOT NULL, reason VARCHAR(1000) NOT NULL,
 created_by CHAR(36) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 FOREIGN KEY(document_id) REFERENCES documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE disposal_requests (
 id CHAR(36) PRIMARY KEY, document_id CHAR(36) NOT NULL, requested_by CHAR(36) NOT NULL,
 reason VARCHAR(1000) NOT NULL, reviewed_by CHAR(36) NULL, state VARCHAR(20) NOT NULL DEFAULT 'pending',
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), FOREIGN KEY(document_id) REFERENCES documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE meetings (
 id CHAR(36) PRIMARY KEY, title VARCHAR(200) NOT NULL, starts_at DATETIME(6) NOT NULL,
 location VARCHAR(200) NOT NULL, owner_id CHAR(36) NOT NULL, quorum_count INT UNSIGNED NOT NULL, voting_rule VARCHAR(30) NOT NULL,
 state VARCHAR(20) NOT NULL DEFAULT 'draft', version INT UNSIGNED NOT NULL DEFAULT 1,
 minutes_text TEXT NULL, created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE meeting_attendees (
 meeting_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, attended BOOLEAN NOT NULL DEFAULT FALSE,
 conflict_declared BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY(meeting_id,user_id),
 FOREIGN KEY(meeting_id) REFERENCES meetings(id), FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE meeting_agendas (
 id CHAR(36) PRIMARY KEY, meeting_id CHAR(36) NOT NULL, ordinal INT UNSIGNED NOT NULL, title VARCHAR(200) NOT NULL,
 document_id CHAR(36) NULL, resolution_text TEXT NULL, state VARCHAR(20) NOT NULL DEFAULT 'draft',
 UNIQUE(meeting_id,ordinal), FOREIGN KEY(meeting_id) REFERENCES meetings(id), FOREIGN KEY(document_id) REFERENCES documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE meeting_votes (
 agenda_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, vote VARCHAR(20) NOT NULL,
 PRIMARY KEY(agenda_id,user_id), FOREIGN KEY(agenda_id) REFERENCES meeting_agendas(id), FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE document_templates (
 id CHAR(36) PRIMARY KEY, code VARCHAR(40) NOT NULL, version INT UNSIGNED NOT NULL,
 title VARCHAR(200) NOT NULL, body_text TEXT NOT NULL, category VARCHAR(30) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'draft', created_by CHAR(36) NOT NULL, UNIQUE(code,version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE retention_policies (
 id CHAR(36) PRIMARY KEY, code VARCHAR(40) NOT NULL UNIQUE, title VARCHAR(150) NOT NULL,
 years INT UNSIGNED NOT NULL, legal_basis VARCHAR(1000) NOT NULL, created_by CHAR(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE domain_audit_head (
 id INT PRIMARY KEY, sequence_no BIGINT UNSIGNED NOT NULL, chain_hash CHAR(64) CHARACTER SET ascii NOT NULL
) ENGINE=InnoDB;
INSERT INTO domain_audit_head VALUES(1,0,REPEAT('0',64));
CREATE TABLE domain_events (
 sequence_no BIGINT UNSIGNED PRIMARY KEY, event_id CHAR(36) NOT NULL UNIQUE,
 actor_id CHAR(36) NOT NULL, document_id CHAR(36) NULL, action VARCHAR(80) NOT NULL,
 payload_json JSON NOT NULL, previous_hash CHAR(64) CHARACTER SET ascii NOT NULL, chain_hash CHAR(64) CHARACTER SET ascii NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX(document_id,sequence_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
