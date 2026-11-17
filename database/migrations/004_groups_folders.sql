-- Additive TEST-only; no removal of document data.
CREATE TABLE organization_groups (
 id CHAR(36) PRIMARY KEY, code VARCHAR(30) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE, version INT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE group_memberships (
 group_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
 PRIMARY KEY(group_id,user_id), FOREIGN KEY(group_id) REFERENCES organization_groups(id), FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE document_group_acl (
 document_id CHAR(36) NOT NULL, group_id CHAR(36) NOT NULL, permission VARCHAR(20) NOT NULL, granted_by CHAR(36) NOT NULL,
 PRIMARY KEY(document_id,group_id,permission), FOREIGN KEY(document_id) REFERENCES documents(id), FOREIGN KEY(group_id) REFERENCES organization_groups(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE repository_folders (
 id CHAR(36) PRIMARY KEY, parent_id CHAR(36) NULL, owner_id CHAR(36) NOT NULL, name VARCHAR(150) NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE, version INT UNSIGNED NOT NULL DEFAULT 1,
 FOREIGN KEY(parent_id) REFERENCES repository_folders(id), FOREIGN KEY(owner_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE document_folders (
 folder_id CHAR(36) NOT NULL, document_id CHAR(36) NOT NULL,
 PRIMARY KEY(folder_id,document_id), FOREIGN KEY(folder_id) REFERENCES repository_folders(id), FOREIGN KEY(document_id) REFERENCES documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
