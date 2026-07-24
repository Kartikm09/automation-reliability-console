# Architecture

## System Context

```mermaid
C4Context
    title Automation Reliability Console
    Person(operator, "Operations user", "Reviews workflow health and incidents")
    System(console, "Reliability Console", "Normalizes execution events and controls replay")
    System_Ext(provider, "Automation provider", "n8n, Make, Zapier, or custom service")
    System_Ext(identity, "Supabase Auth", "Identity and sessions")
    Rel(provider, console, "Signed execution events")
    Rel(operator, console, "Authenticated browser session")
    Rel(console, identity, "Validates user identity")
```

## Component Responsibilities

| Component       | Responsibility                                                  | Trust boundary              |
| --------------- | --------------------------------------------------------------- | --------------------------- |
| React web       | Tenant-scoped operational workflows                             | Publishable key only        |
| Edge Functions  | Public webhook and authenticated platform commands              | Service key server-side     |
| PostgreSQL      | Authorization, invariants, state transitions, audit history     | Authoritative               |
| PGMQ + Cron     | Durable retries and scheduled health checks                     | Service-only RPCs           |
| Realtime        | Small private invalidation messages                             | Organization topic policy   |
| Private Storage | Execution artifacts                                             | Record-backed signed access |
| FastAPI         | Reusable normalization, redaction, analytics, replay simulation | Internal token              |

## Event Ingestion

```mermaid
sequenceDiagram
    participant P as Provider
    participant E as Ingest Edge Function
    participant D as PostgreSQL
    participant Q as PGMQ
    participant W as Queue Worker
    P->>E: raw body + key + timestamp + HMAC
    E->>E: size, age, credential hash, HMAC checks
    E->>D: insert immutable raw event
    alt duplicate identity or payload hash
        D-->>E: unique conflict
        E-->>P: 200 duplicate
    else accepted
        E->>Q: enqueue raw_event_id + correlation_id
        E-->>P: 202 accepted
        W->>Q: read with visibility timeout
        W->>D: load raw event
        W->>W: normalize provider payload
        W->>D: apply_canonical_event transaction
        W->>Q: archive message
    end
```

The raw body is used for signature verification before JSON parsing.
`original_payload` and `payload_hash` are immutable. Normalization warnings are
stored on the workflow metadata without rejecting unknown additional fields.

## Event Ordering

The tuple `(integration_source_id, external_run_id)` identifies a canonical run.
An event may keep the current state or make a legal forward transition. An older
event cannot overwrite a newer terminal state; it is marked processed with
`out_of_order_ignored`. An illegal transition is recorded as a processing
failure. Repeated failures become dead-letter records after five reads.

## Replay

```mermaid
sequenceDiagram
    participant O as Operator
    participant D as PostgreSQL
    participant A as Administrator
    participant Q as Replay Queue
    participant W as Worker
    O->>D: request_replay(idempotency key)
    D->>Q: enqueue request
    D-->>O: pending request
    A->>D: approve request
    D->>Q: enqueue approved request
    W->>D: process_replay_job
    D->>D: create child run linked by parent_run_id
    D-->>O: private replay.updated broadcast
```

The reference replay is deterministic and synthetic. It proves authorization,
idempotency, lineage, background processing, and audit behavior without invoking
an external customer system.

## State Machines

```mermaid
stateDiagram-v2
    [*] --> queued
    queued --> running
    queued --> succeeded
    queued --> failed
    queued --> cancelled
    queued --> timed_out
    running --> succeeded
    running --> failed
    running --> cancelled
    running --> timed_out
```

```mermaid
stateDiagram-v2
    open --> acknowledged
    open --> investigating
    acknowledged --> investigating
    acknowledged --> resolved
    investigating --> resolved
    resolved --> closed
```

```mermaid
stateDiagram-v2
    pending --> approved
    pending --> rejected
    approved --> processing
    processing --> succeeded
    processing --> failed
```

## Raw Versus Canonical Data

Raw events answer “what exactly did the provider send?” Canonical runs answer
“what is the current operational truth?” Keeping both allows adapter changes,
reprocessing, schema-version handling, forensic review, and stable frontend
queries without mutating source evidence.

## Failure Strategy

- Webhook failures return structured errors without payload logging.
- Queue reads use a 60-second visibility timeout.
- Consumers archive only after successful processing.
- Five unsuccessful reads move a safe message summary to a dead-letter queue.
- Idempotency is enforced at raw event, run, replay request, and replay run levels.
- Correlation IDs connect ingress, queue, state change, and audit evidence.
