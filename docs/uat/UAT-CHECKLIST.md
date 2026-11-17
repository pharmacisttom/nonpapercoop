# UAT scenarios — pending human execution

- Approved Google account enters; unknown/pending/suspended/revoked accounts denied; email change does not change sub identity.
- Wrong signature/audience/issuer/nonce/expiry/email verification denied; provider outage/cancellation/timeout fails closed. Real Google configuration required.
- Cookie Secure/HttpOnly/SameSite and rotation verified on HTTPS; logout/revoke/idle/absolute expiry and concurrent requests tested.
- Each role denied unauthorized endpoint; administrator cannot read another owner's draft. Full department/ACL cases wait for ABAC implementation.
- Thai labels on desktop/mobile, readable contrast, screen reader, Tab/Shift-Tab, Escape, focus restoration, default Cancel on destructive dialogs.
- Cancel makes no request; pending operation disables duplicate submission; failure never shows success; backend confirmation precedes success.
- Popup with fixed headers, Bootstrap, Select2 and DataTables once those components exist; browser mix beyond Edge not tested yet.
- MySQL8 migration/FK/uniqueness/transaction rollback/version races and private session store; restore on independent instance.
- P2+ gates: malicious uploads/download ACL, registry concurrency/idempotency, maker-checker/double approval, signed hash tamper, retention/legal holds, confidential search/export. Not implemented; cannot mark PASS.

Sign-off fields: tester, date/time Asia/Bangkok, release hash, engine/browser versions, scenario/result, evidence path, issue severity/owner, authorized acceptance. No fabricated signatures or screenshots.
