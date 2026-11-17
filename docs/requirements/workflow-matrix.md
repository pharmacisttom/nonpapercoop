# Target state machine — design only

| From | Action | To | Required control |
|---|---|---|---|
| DRAFT | submit | SUBMITTED | owner, metadata, scanned files, expected version |
| SUBMITTED | start | IN_REVIEW | published definition snapshot |
| IN_REVIEW | approve | APPROVED | assignee, ACL, maker-checker, assurance, task/version lock |
| IN_REVIEW | return | RETURNED_FOR_REVISION | reason/history; new revision on editing |
| IN_REVIEW | reject | REJECTED | reason, consistent final task |
| APPROVED | request signing | SIGNING_PENDING | frozen digest/signer policy |
| SIGNING_PENDING | sign | SIGNED | consent, actor, digest equality, timestamp/evidence |
| SIGNED | number | REGISTERED | transaction/counter lock, unique keys, idempotency |
| REGISTERED | distribute | DISTRIBUTED | recipient ACL, separate acknowledgement |
| DISTRIBUTED | archive | ARCHIVED | retention/holds, immutable originals |

Sequential/parallel assignments snapshot policy. Duplicate action keys and locks required. Cancel/expire require explicit policy. No transition API is currently exposed. Corrections supersede originals; never erase released history.
