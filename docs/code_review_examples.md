# Constructive Code Review Examples

- “This query is tenant-filtered in the browser, but the database policy should
  prove the same boundary. Please add an RLS test using the second organization.”
- “The retry path inserts another audit event for an idempotent request. Could
  the conflict branch return before enqueue and audit, with a regression test?”
- “This signed URL accepts a client path. Please resolve the authorized artifact
  record first and sign only its stored path.”
- “The benchmark claim needs before-and-after evidence from the same fixture and
  command. Please record both or remove the claim.”
