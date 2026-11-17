# Trust boundaries

Browser → dedicated TEST TLS Nginx → loopback Express → loopback TEST MySQL. Browser → Google GIS. Express → Google trusted signing-key endpoint via verification library. No financial or legacy cooperative integration.

Untrusted credential → bounded JSON → one-use session challenge → Google signature/claim verification → approved sub lookup → rotated server session. Browser stores no ID/access token; only HttpOnly cookie. Public client ID/CSRF/nonce remain transient application state.

Mutation → schema/role/owner/version checks → SQL transaction + audit → commit → JSON → success popup. SQL/audit errors roll back. No files released, approved or signed. Actual host/network isolation remains an independent deployment prerequisite.
