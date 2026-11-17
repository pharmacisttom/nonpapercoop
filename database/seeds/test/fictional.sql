-- Explicitly fictional. No usable real Google identity; for isolated DB tests only.
INSERT INTO users(id,email,role,status) VALUES
('00000000-0000-4000-8000-000000000001','staff@example.invalid','department_staff','active'),
('00000000-0000-4000-8000-000000000002','auditor@example.invalid','auditor_readonly','active');
-- No google_identities rows: these fixtures cannot authenticate against real Google.
