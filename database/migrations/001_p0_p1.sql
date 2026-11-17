-- Additive TEST-only migration. Execute manually after review; never auto-run at startup.
CREATE TABLE users (
 id CHAR(36) PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE,
 role ENUM('system_admin','security_admin','records_officer','department_staff','department_head','manager','chairperson','board_member','finance_officer','procurement_officer','auditor_readonly','member_service_officer') NOT NULL,
 status ENUM('pending','active','suspended','revoked') NOT NULL DEFAULT 'active',
 session_version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE google_identities (
 google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 user_id CHAR(36) NOT NULL UNIQUE,
 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE sessions (
 session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
 expires INT UNSIGNED NOT NULL,
 data MEDIUMTEXT COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE documents (
 id CHAR(36) PRIMARY KEY, title VARCHAR(250) NOT NULL,
 category ENUM('general','saraban','board','finance','procurement','member') NOT NULL,
 owner_id CHAR(36) NOT NULL,
 status ENUM('draft','submitted','approved','rejected','returned') NOT NULL DEFAULT 'draft',
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TIMESTAMP NULL,
 FOREIGN KEY (owner_id) REFERENCES users(id), INDEX(owner_id,deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE audit_events (
 id CHAR(36) PRIMARY KEY, actor_id CHAR(36) NULL,
 action VARCHAR(80) NOT NULL, target_id VARCHAR(255) NULL,
 created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX(actor_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Runtime account: SELECT/INSERT on audit_events; no UPDATE/DELETE.

CREATE TABLE auth_nonces (nonce_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY, consumed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
