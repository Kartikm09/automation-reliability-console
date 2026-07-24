# Event Ordering and Conflict Resolution

1. `received_at` records platform arrival; `event_timestamp` records provider time.
2. Event identity is source plus external event ID, with payload hash as fallback.
3. Run identity is source plus external run ID.
4. A newer event may keep a state or make a legal forward transition.
5. An older event cannot overwrite an existing terminal state.
6. An illegal backward transition is recorded as a processing failure.
7. The raw event is retained in every outcome.
8. Five processing reads move a safe job summary to dead-letter handling.

Clock trust is deliberately limited. Provider time controls event ordering only
within one run after signature age is checked against platform time.
