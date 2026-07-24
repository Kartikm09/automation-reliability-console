"""Environment-backed application configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Settings:
    """Runtime settings with conservative defaults for local development."""

    supabase_url: str = ""
    supabase_secret_key: str = ""
    internal_api_token: str = "local-development-only"
    log_level: str = "INFO"
    cors_origins: tuple[str, ...] = (
        "http://127.0.0.1:4173",
        "http://127.0.0.1:5173",
    )

    @classmethod
    def from_environment(cls) -> Settings:
        origins = tuple(
            value.strip()
            for value in os.getenv(
                "CORS_ORIGINS",
                "http://127.0.0.1:4173,http://127.0.0.1:5173",
            ).split(",")
            if value.strip()
        )
        return cls(
            supabase_url=os.getenv("SUPABASE_URL", "").rstrip("/"),
            supabase_secret_key=os.getenv("SUPABASE_SECRET_KEY", ""),
            internal_api_token=os.getenv("INTERNAL_API_TOKEN", "local-development-only"),
            log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
            cors_origins=origins,
        )

    @property
    def supabase_configured(self) -> bool:
        return self.supabase_url.startswith(("http://", "https://")) and bool(
            self.supabase_secret_key
        )
