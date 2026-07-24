# Threat Model

## Protected Assets

Tenant records, webhook credentials, raw payloads, artifact objects, audit
history, internal tokens, and service-role access.

## Principal Threats

| Threat                | Mitigation                                                    |
| --------------------- | ------------------------------------------------------------- |
| Cross-tenant query    | Forced RLS and synthetic JWT boundary tests                   |
| Role escalation       | Manager policies restrict old and new role values             |
| Forged webhook        | One-time credential hash, exact-body HMAC, timestamp window   |
| Replay delivery       | Unique event identities and request-age validation            |
| Payload mutation      | Immutable source trigger and append-only audit evidence       |
| Arbitrary signed path | Lookup artifact record first; sign stored path only           |
| Secret in browser     | Publishable key only; bundle and repository scans             |
| Queue loss            | Visibility timeout, explicit archive, retries, dead letters   |
| Log disclosure        | Structured event metadata without full payload or credentials |

## Out of Scope

The local stack is not a hardened execution sandbox. DDoS protection, managed
WAF, external email delivery, official provider credentials, and production
incident response are outside this portfolio implementation.
