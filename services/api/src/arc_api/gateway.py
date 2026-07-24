"""Minimal Supabase RPC gateway using server-only credentials."""

from __future__ import annotations

from typing import Any

import httpx

from arc_api.config import Settings


class SupabaseGateway:
    """Call narrowly scoped database RPC functions through PostgREST."""

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self._settings = settings
        self._client = client

    async def rpc(self, function_name: str, body: dict[str, Any]) -> Any:
        if not self._settings.supabase_configured:
            raise RuntimeError("Supabase server configuration is unavailable.")
        headers = {
            "apikey": self._settings.supabase_secret_key,
            "authorization": f"Bearer {self._settings.supabase_secret_key}",
            "content-type": "application/json",
        }
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=10.0)
        try:
            response = await client.post(
                f"{self._settings.supabase_url}/rest/v1/rpc/{function_name}",
                headers=headers,
                json=body,
            )
            response.raise_for_status()
            return response.json()
        finally:
            if owns_client:
                await client.aclose()
