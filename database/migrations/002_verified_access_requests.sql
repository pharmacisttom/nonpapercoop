-- Additive TEST enrollment evidence only. Does not create users or grant access.
CREATE TABLE verified_access_requests (
 google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 verified_email VARCHAR(254) NOT NULL,
 verified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX (verified_email, verified_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
