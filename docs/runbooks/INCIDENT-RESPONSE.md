# TEST incident response

Stop affected TEST app only; preserve append-only audit, release hash, sanitized timestamps and relevant request IDs. Never log Google tokens/cookies/secrets. For stolen session revoke account security version; for leaked secrets rotate TEST OAuth/session/DB keys and require new login. Do not introduce bypass login during Google outage.

Review authorization and deployment isolation; restrict TEST network/app access, investigate from copies. If integrity uncertain restore into a new independent TEST instance and compare evidence before resuming. Notify authorized project/security owner through approved channels; no automatic messages to third parties. Record incident timeline, impact, cause, fixes and verification. Legacy production remains outside this workflow.
