"""Allow-list summaries and remove credential-like values."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

SENSITIVE_FRAGMENTS = (
    "authorization",
    "cookie",
    "password",
    "private_key",
    "secret",
    "service_role",
    "token",
    "webhook_key",
)


def redact_mapping(value: Mapping[str, Any], *, depth: int = 0) -> dict[str, Any]:
    """Return a bounded, recursively redacted mapping."""

    if depth > 3:
        return {"_truncated": True}
    result: dict[str, Any] = {}
    for key, item in list(value.items())[:50]:
        normalized_key = str(key)
        if any(fragment in normalized_key.lower() for fragment in SENSITIVE_FRAGMENTS):
            result[normalized_key] = "[REDACTED]"
        elif isinstance(item, Mapping):
            result[normalized_key] = redact_mapping(item, depth=depth + 1)
        elif isinstance(item, list):
            result[normalized_key] = [
                redact_mapping(entry, depth=depth + 1) if isinstance(entry, Mapping) else entry
                for entry in item[:25]
            ]
        elif isinstance(item, str):
            result[normalized_key] = item[:500]
        elif item is None or isinstance(item, (bool, int, float)):
            result[normalized_key] = item
        else:
            result[normalized_key] = str(item)[:200]
    return result
