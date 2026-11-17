# ADR-001: GIS ID-token transport

Status: baseline implemented; review pending. Choose Google Identity Services JS button/popup with server ID-token verification, supported by user instruction. v1.1's preferred code-flow is not implemented. GET `/api/v1/auth/google/start` returns nonce and CSRF; GIS callback POSTs JSON to `/api/v1/auth/google/callback`. No redirect/code exchange, client secret or Google API permission needed. State/PKCE apply if future authorization-code flow is introduced; current login uses session nonce + exact Origin/CSRF and one-use DB challenge consumption.

Token signature verified by google-auth-library; exact issuer/audience, expiry, issued-at, nonce, verified email checked. Active allowlist is bound to sub before login, not auto-linked by email. Session and CSRF rotate. Reauth requires same sub and fresh token within 5 minutes but does not establish Google MFA assurance. Approval/signing remain unavailable.

## Administrator TEST setup

1. Create a distinct TEST Cloud project/consent configuration and Web OAuth client. Never reuse old client/secret.
2. Configure exact owned TEST HTTPS JavaScript origin (or explicit local development origin). Add consent-screen TEST users if required.
3. This GIS JS flow uses no Google redirect URI. `/api/v1/auth/google/callback` is the application's same-origin POST endpoint, not an OAuth code redirect.
4. Protect GOOGLE_CLIENT_ID/APP_ORIGIN environment. Independently verify approved Google sub/email with two reviewers; bootstrap CLI has no bypass login.
5. Test real sign-in, invalid/unapproved/revoked account, cancellation/provider failure, cookies/CSP and key refresh. Never log credential tokens. No real credentials supplied or operational OAuth claim made.
6. Recovery is manual dual-control identity review; no password/magic-link fallback.

References: [Google verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [GIS JS](https://developers.google.com/identity/gsi/web/reference/js-reference), [GIS integration](https://developers.google.com/identity/gsi/web/guides/integrate), [SweetAlert2](https://github.com/sweetalert2/sweetalert2/releases/tag/v11.26.25).
