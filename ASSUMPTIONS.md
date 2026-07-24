# Assumptions

1. **Reference implementation:** This is an independently designed portfolio
   project and is not represented as client work or an existing production
   system.
2. **Region:** Hosted data should use a European region, preferably Frankfurt,
   because the target demonstration context is European.
3. **Cost:** Free-tier resources are preferred. No plan upgrade, purchase, or
   billing change is authorized.
4. **Identity:** Demonstration users are created from local or hosted environment
   variables. No universal password is committed.
5. **Delivery providers:** Supabase is the required managed backend. A web or API
   host is used only when an authenticated provider is available without a
   billing decision.
6. **Queue cadence:** Consumers use conservative scheduled intervals suitable
   for a portfolio environment, not high-frequency production polling.
7. **Payload safety:** Summaries are allow-listed and redacted; raw synthetic
   payloads remain restricted to server-side processing.
8. **Webhook authenticity:** Integration secrets are high-entropy values shown
   once, hashed at rest, and used as HMAC keys over the exact request body plus
   timestamp.
9. **Replay behavior:** The demonstration replay worker creates a linked run and
   deterministic synthetic outcome. It does not invoke a real external
   automation provider.
10. **Realtime:** Broadcast messages contain identifiers and safe status fields;
    the browser refetches authoritative rows after messages or reconnection.
11. **Artifacts:** Demonstration uploads are small, non-sensitive files in a
    private bucket.
12. **Operational limits:** This environment demonstrates sound architecture but
    is not described as a hardened untrusted-code sandbox or a production SLA
    service.
